const express = require('express');
const app = require('../app');
const router = express.Router();
const cassandra = require('cassandra-driver')
// const {AsyncRouter} = require("express-async-router");
// const router = AsyncRouter();


const client = new cassandra.Client({
                contactPoints: ['localhost'],
                localDataCenter: 'datacenter1',
                keyspace: 'sist_keyspace'
            })
/**
 * Endpoint HOME
 */
router.get('/',  (req, res) => {
    let response = { title: 'holis', message: 'mundo'}
    res.render('pages/index', response)
})

/**
 * Endpoint entidades
 */
router.get('/entidades', (req, res) => {
    client.execute('select * from entidad_financiera', function (err, result) {
        if (err) throw err
        console.log(result)
        res.render('pages/entidades', {result})
    })
})

/**
 * Endpoint cuentahabientes
 */
router.get('/cuentahabientes', (req, res) => {
    let query = `select * from cuentahabiente`
    client.execute(query , function (err, result) {
        if (err) throw err
        console.log(result)
        res.render('pages/cuentahabientes', {result})
    })
})

/**
* Endpoint cuentahabientes cuentas
*/
router.get('/cuentahabiente/cuentas/:cui', (req, res) => {
    let cui = req.params.cui
    let query = `select * from cuentas_por_cuentahabiente where cui = ${cui}`
    client.execute(query , function (err, result) {
        if (err) throw err
        console.log(result)
        res.render('pages/cuentas_cuentahabiente', {result})
    })
})

/**
 * Endpoint cuentahabiente nuevo
 */
router.get('/cuentahabiente/nuevo', (req, res) => {
    res.render('pages/crear_cuentahabiente')
})

/**
 * Endpoint cuentahabientes crear
 */
router.post('/cuentahabiente/nuevo', (req, res) => {
    let cui = req.body.cui
    let nombre = req.body.nombre
    let apellido = req.body.apellido
    let email = req.body.email
    let genero = req.body.genero

    let queryCH = `select * from cuentahabiente where cui = ${cui}`
    client.execute(queryCH).then((result) => {
        console.log(result)
        if (result.rowLength > 0) {
            result.error = 'Cuentahabiente con CUI ingresado ya existe en el sistema.  Por favor ingrese CUI distinto.'
            console.log(result)
            res.render('pages/crear_cuentahabiente', {result})
        }
    })

    let query = `insert into cuentahabiente (cui, nombre, apellido, email, genero) values(${cui},'${nombre}','${apellido}','${email}','${genero}');`
    console.log(query)
    client.execute(query).then((result) => {
        console.log(result)
        result.mensaje = "Cuentahabiente ingresado exitosamente."
        res.render('pages/crear_cuentahabiente', {result})
    })
})

/**
* Endpoint cuentahabientes ingresar operación
*/
router.get('/cuentahabiente/operacion', (req, res) => {
    res.render('pages/cuentahabiente_operacion')
})

/**
 * Endpoint cuentahabientes guardar operación
 */
router.post('/cuentahabiente/operacion', async (req, res) => {
    let monto = req.body.monto
    let cuentaPaga = req.body.cuenta_paga
    let cuentaCobra = req.body.cuenta_cobra

    let rowResult = {}

    if (monto <= 0) {
        console.log("monto es inválido")
        rowResult.error = 'Monto no válido para realizar operación.'
        res.render('pages/cuentahabiente_operacion', {rowResult})
        return
    }

    let queryVerificaSaldo = `select * from cuentas_por_cuentahabiente`
    const cuentas = await client.execute(queryVerificaSaldo, [], {prepare: true});

    // Verificaciones de saldo y existencia de cuentas
    console.log(cuentas.first())
    let rowPaga = {}
    let rowCobra = {}
    cuentas.rows.forEach(r => {
        if (r.numero_cuenta == cuentaPaga) rowPaga = r
        if (r.numero_cuenta == cuentaCobra) rowCobra = r
    })
    console.log('row Paga')
    console.log(rowPaga)
    console.log('row COBRA')
    console.log(rowCobra)
    if (Object.keys(rowPaga).length === 0) {
        rowResult.error = 'Cuenta que paga no existe en el sistema.'
        res.render('pages/cuentahabiente_operacion', {rowResult})
        return
    }
    if (Object.keys(rowCobra).length === 0) {
        rowResult.error = 'Cuenta que cobra no existe en el sistema.'
        res.render('pages/cuentahabiente_operacion', {rowResult})
        return
    }
    if (rowPaga.saldo_inicial <= monto) {
        rowResult.error = 'Saldo de cuenta que paga es menor a monto de transferencia.'
        res.render('pages/cuentahabiente_operacion', {rowResult})
        return
    }

    //Obteniendo datos de cuentahabiente para insertar en tablas de operaciones cuentahabientes
    let query = `select * from cuentahabiente where cui = ?;`
    console.log(query)
    let queryRes = await client.execute(query, [ rowPaga.cui ], { prepare: true });
    console.log("cuentahabiente paga")
    console.log(queryRes.first())
    let cuentaHabientePaga = queryRes.first();

    query = `select * from cuentahabiente where cui = ?;`
    console.log(query)
    queryRes = await client.execute(query, [ rowCobra.cui ], { prepare: true })
    console.log("cuentahabiente cobra")
    console.log(queryRes.first())
    let cuentaHabienteCobra = queryRes.first();

    let lastOperacionId = 0;

    //Obteniendo ultimo valor de operacion_id para operaciones por cuentahabiente
    query = `select * from operaciones_por_cuentahabiente;`
    console.log(query)
    queryRes = await client.execute(query,[], { prepare: true });
    queryRes.rows.forEach(r => {
        if (BigInt(r.operacion_id) > BigInt(lastOperacionId)) {
            lastOperacionId = r.operacion_id
        }
    })
    console.log("LAST OPERACION ID")
    console.log(lastOperacionId)

    let datetime = new Date();
    let date = datetime.toISOString().slice(0,10)
    console.log("****** DATE *****")
    console.log(date);

    //Insertando operacion para cuentahabiente paga
    query = `insert into operaciones_por_cuentahabiente (cui, operacion_id, nombre_cuentahabiente, apellido_cuentahabiente, fecha, tipo_operacion, no_cuenta_cobra, no_cuenta_paga, monto) 
                values(?, ?, ?, ?, ?, ?, ?, ?, ?);`
    let params = [cuentaHabientePaga.cui, ++lastOperacionId, cuentaHabientePaga.nombre, cuentaHabientePaga.apellido, date, "Débito", cuentaCobra, cuentaPaga, monto]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})

    //Insertando operacion para cuentahabiente paga (tabla por mes)
    query = `insert into operaciones_por_cuentahabiente_por_mes (cui, operacion_id, nombre_cuentahabiente, apellido_cuentahabiente, fecha, tipo_operacion, no_cuenta_cobra, no_cuenta_paga, monto) 
                values(?, ?, ?, ?, ?, ?, ?, ?, ?);`
    params = [cuentaHabientePaga.cui, lastOperacionId, cuentaHabientePaga.nombre, cuentaHabientePaga.apellido, date, "Débito", cuentaCobra, cuentaPaga, monto]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})
    let lastOperacionPaga = lastOperacionId;

    //Insertando operacion para cuentahabiente cobra
    query = `insert into operaciones_por_cuentahabiente (cui, operacion_id, nombre_cuentahabiente, apellido_cuentahabiente, fecha, tipo_operacion, no_cuenta_cobra, no_cuenta_paga, monto) 
                values(?, ?, ?, ?, ?, ?, ?, ?, ?);`
    params = [cuentaHabienteCobra.cui, ++lastOperacionId, cuentaHabienteCobra.nombre, cuentaHabienteCobra.apellido, date, "Crédito", cuentaCobra, cuentaPaga, monto]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})

    //Insertando operacion para cuentahabiente cobra (tabla por mes)
    query = `insert into operaciones_por_cuentahabiente_por_mes (cui, operacion_id, nombre_cuentahabiente, apellido_cuentahabiente, fecha, tipo_operacion, no_cuenta_cobra, no_cuenta_paga, monto) 
                values(?, ?, ?, ?, ?, ?, ?, ?, ?);`
    params = [cuentaHabienteCobra.cui, lastOperacionId, cuentaHabienteCobra.nombre, cuentaHabienteCobra.apellido, date, "Crédito", cuentaCobra, cuentaPaga, monto]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})
    let lastOperacionCobra = lastOperacionId;


    let saldoCuentaPaga = rowPaga.saldo_inicial - monto;
    //Actualizando saldo de cuenta paga
    query = `update cuentas_por_cuentahabiente set saldo_inicial = ?   
                where cui = ? and numero_cuenta = ? and nombre_cuentahabiente = ? and apellido_cuentahabiente = ?;`
    params = [saldoCuentaPaga, rowPaga.cui, cuentaPaga, cuentaHabientePaga.nombre, cuentaHabientePaga.apellido]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})

    let saldoCuentaCobra = rowCobra.saldo_inicial + monto;
    //Actualizando saldo de cuenta cobra
    query = `update cuentas_por_cuentahabiente set saldo_inicial = ?   
                where cui = ? and numero_cuenta = ? and nombre_cuentahabiente = ? and apellido_cuentahabiente = ?;`
    params = [saldoCuentaCobra, rowCobra.cui, cuentaCobra, cuentaHabienteCobra.nombre, cuentaHabienteCobra.apellido]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})


    //obteniendo datos de entidad de cuenta que paga y que cobra
    query = `select * from entidad_financiera;`
    console.log(query)
    queryRes = await client.execute(query, [], {prepare: true})
    let entidadPaga = {}
    let entidadCobra = {}
    queryRes.rows.forEach(r => {
        if (r.nombre == rowCobra.nombre_entidad) entidadCobra = r
        if (r.nombre == rowPaga.nombre_entidad) entidadPaga = r
    })

    //insertando operacion en operaciones por entidad (entidad que paga)
    query = `insert into operaciones_por_entidad (entidad_id, operacion_id, nombre_entidad, fecha, tipo_operacion, no_cuenta_cobra, no_cuenta_paga, monto) 
                values(?, ?, ?, ?, ?, ?, ?, ?);`
    params = [entidadPaga.entidad_id, lastOperacionPaga, entidadPaga.nombre, date, "Débito", cuentaCobra, cuentaPaga, monto]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})

    //insertando operacion en operaciones por entidad (entidad que cobra)
    query = `insert into operaciones_por_entidad (entidad_id, operacion_id, nombre_entidad, fecha, tipo_operacion, no_cuenta_cobra, no_cuenta_paga, monto) 
                values(?, ?, ?, ?, ?, ?, ?, ?);`
    params = [entidadCobra.entidad_id, lastOperacionCobra, entidadCobra.nombre, date, "Crédito", cuentaCobra, cuentaPaga, monto]
    console.log(query)
    queryRes = await client.execute(query, params, {prepare: true})

    rowResult.mensaje = `Operación realizada con exito. Se transfirieron ${monto} de la cuenta ${cuentaPaga} (${cuentaHabientePaga.nombre} ${cuentaHabientePaga.apellido}) hacia la cuenta ${cuentaCobra} (${cuentaHabienteCobra.nombre} ${cuentaHabienteCobra.apellido})`
    res.render('pages/cuentahabiente_operacion', {rowResult})
    return

})

/**
 * Endpoint Operaciones por Entidad
 */
router.get('/operaciones/entidad/:id', (req, res) => {
    let id = req.params.id;

    let query = `select * from operaciones_por_entidad where entidad_id = ${id}`
    client.execute(query, function (err, result) {
        if (err) throw err
        console.log(result)
        res.render('pages/operaciones_por_entidad', {result})
    })
})

/**
 * Endpoint Operaciones por Entidad - totales
 */
router.get('/operaciones/entidad/totales/:id', (req, res) => {
    let id = req.params.id;

    let query = `select sum(monto)as total_credito, nombre_entidad as nombre from operaciones_por_entidad where entidad_id = ${id} and tipo_operacion = 'Crédito'`
    client.execute(query, function (err, result) {
        if (err) throw err
        console.log(result)
        credito = result
        let query2 = `select sum(monto)as total_debito, nombre_entidad as nombre from operaciones_por_entidad where entidad_id = ${id} and tipo_operacion = 'Débito'`
        client.execute(query2, function (err, result) {
            if (err) throw err
            console.log(result)
            debito = result
            console.log('credito y debito')
            console.log(credito)
            console.log(debito)
            res.render('pages/operaciones_por_entidad_totales', {credito, debito})
        })
    })
})


/**
 * Endpoint Operaciones por Cuentahabiente
 */
router.get('/operaciones/cuentahabiente/:cui', (req, res) => {
    let cui = req.params.cui;

    let query = `select * from operaciones_por_cuentahabiente where cui = ${cui}`
    client.execute(query, function (err, result) {
        if (err) throw err
        console.log(result)
        res.render('pages/operaciones_por_cuentahabiente', {result})
    })
})

/**
 * Endpoint Operaciones por Cuentahabiente Por Mes
 */
router.get('/operaciones/cuentahabiente/mes/:cui', (req, res) => {
    let cui = req.params.cui;

    let query = `select * from cuentahabiente where cui = ${cui}`
    client.execute(query, function (err, result) {
        if (err) throw err
        result.date=false
        console.log(result)
        res.render('pages/operaciones_por_cuentahabiente_por_mes', {result})
    })
})

/**
 * Endpoint Operaciones por Cuentahabiente Por Mes
 */
router.post('/operaciones/cuentahabiente/mes', (req, res) => {
    let cui = req.body.cui;
    let mes = req.body.mes
    let fechaInicial = mes + '-01'
    let fechaFinal = mes + '-31'
    console.log('fechas')
    console.log(mes)
    console.log(fechaInicial)
    console.log(fechaFinal)
    let mesLetras = getMesLetras(mes)

    let query = `select * from operaciones_por_cuentahabiente_por_mes where cui = ${cui} and fecha >= '${fechaInicial}' and fecha <= '${fechaFinal}'`
    console.log(query)
    client.execute(query, function (err, result) {
        if (err) throw err
        result.date=true
        result.mes = mesLetras
        console.log(result)
        res.render('pages/operaciones_por_cuentahabiente_por_mes', {result})
    })
})

const getMesLetras = (mes) => {
    let d = new Date(mes);
    let month = new Array();
    month[0] = "Enero";
    month[1] = "Febrero";
    month[2] = "Marzo";
    month[3] = "Abril";
    month[4] = "Mayo";
    month[5] = "Junio";
    month[6] = "Julio";
    month[7] = "Agosto";
    month[8] = "Septiembre";
    month[9] = "Octubre";
    month[10] = "Noviembre";
    month[11] = "Diciembre";
    return month[d.getMonth()];
}
module.exports = router;
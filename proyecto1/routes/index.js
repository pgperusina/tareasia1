const express = require('express');
const app = require('../app');
const router = express.Router();


/**
 * Endpoint move
 */
router.get('/index',  (req, res) => {
    let turno = req.params.turno
    let estado = req.params.estado
    console.log(turno);
    console.log(estado);
    let response = { turno: 'turno', estado: 'estado'}
    res.end('24')
    //res.render('pages/index', response)
})

module.exports = router;
function setDataTable(selector, pageLength = 10) {
    $(`${selector}`).DataTable({
        initComplete: function () {
            this.api().columns().every(function () {
                var column = this;
                var select = $('<select><option value=""></option></select>')
                    .appendTo($(column.footer()).empty())
                    .on('change', function () {
                        var val = $.fn.dataTable.util.escapeRegex(
                            $(this).val()
                        );
                        //to select and search from grid
                        column
                            .search(val ? '^' + val + '$' : '', true, false)
                            .draw();
                    });

                column.data().unique().sort().each(function (d, j) {
                    select.append('<option value="' + d + '">' + d + '</option>')
                });
            });
        },
        pageLength: pageLength,
        lengthMenu: [[5, 10, 20, 50, -1], [5, 10, 20, 50, 'Todas']]
    });
}

const verOperaciones = (idEntidad) => {
    window.location.href = `/operaciones/entidad/${idEntidad}`
}

const verOperacionesCuentaHabiente = (idCuentaHabiente) => {
    window.location.href = `/operaciones/cuentahabiente/${idCuentaHabiente}`
}

const verOperacionesCuentaHabientePorMes = (idCuentaHabiente) => {
    window.location.href = `/operaciones/cuentahabiente/mes/${idCuentaHabiente}`
}

const verTotales = (idEntidad) => {
    window.location.href = `/operaciones/entidad/totales/${idEntidad}`
}

const verCuentas = (idCuentaHabiente) => {
    window.location.href = `/cuentahabiente/cuentas/${idCuentaHabiente}`
}
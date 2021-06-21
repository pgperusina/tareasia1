const express = require('express');
const url = require('url');
const router = express.Router();


/**
 * Endpoint move
 */
router.get('/index',  (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const url = new URL(fullUrl);

    let turno = url.searchParams.get('turno')
    let estado = url.searchParams.get('estado')
    console.log(turno);
    console.log(estado);
    res.end('24')
    //res.render('pages/index', response)
})

module.exports = router;
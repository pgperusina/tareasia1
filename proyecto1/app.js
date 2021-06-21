const express = require('express')

const path = require('path');
const bodyParser = require('body-parser')
const routes = require('./routes/index')

const app = express();

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: false }))
//app.use(bodyParser.json())
app.use('/', routes);
//app.use('/static', express.static(path.join(__dirname, 'public')))

module.exports = app

const express = require('express');
const app = express();

app.use(express.json());

app.use('/cunei', require('./routes/cunei.routes'));

module.exports = app;
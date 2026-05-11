const express = require('express');
const app = express();

app.use(express.json());

cors = require('cors')
app.use(cors({
    origin: 'http://localhost:8081'
}));
app.use('/cunei', require('./routes/cunei.routes'));
app.use('/users', require('./routes/users.routes'));
app.use('/submissions', require('./routes/submissions.routes'))

module.exports = app;
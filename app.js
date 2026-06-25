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

const https = require("https");

https.get(
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  res => {
    console.log("STATUS:", res.statusCode);
    res.on("data", d => console.log(d.toString().slice(0, 200)));
  }
).on("error", console.error);

module.exports = app;
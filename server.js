const express = require('express');
const app = express();
const path = require('path');
const herokuProxy = require('heroku-proxy');
const port = process.env.PORT || 8080;

app.use(express.static(__dirname + '/dist'));
// app.use(herokuProxy());

app.listen(port);

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname + '/dist/index.html'));
})

console.log(`Server is listening on ${port}..`);
var express = require("express"),
  app = express(),
  port = process.env.PORT || 5000,
  bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var routes = require("./api/routes/routes");
routes(app);
app.listen(port);

console.log("CryptAlert API server started on: " + port);
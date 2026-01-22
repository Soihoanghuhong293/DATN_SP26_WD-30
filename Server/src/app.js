const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const productRoutes = require("./routes/product.route");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/task", productRoutes);

module.exports = app;

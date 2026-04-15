const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const route = require("./api/route.js");

const app = express();
const PORT = 5000;


app.use(cors());
app.use(bodyParser.json());

route(app);

app.listen(PORT, "0.0.0.0", async (error) => {
  if (error) throw error;
  console.log(`Server is running on port ${PORT}`);
});

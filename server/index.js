const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());


app.get("/", async (req, res) => {
  res.status(200).json({ success: "Hello word" });
});

app.listen(port, () => console.log(`Server running on port ${port}`));

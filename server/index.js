// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { scrapeAndExport } = require('./controllers/scraperController');
const path = require("path");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Route pour lancer le scraping
app.post('/scrape', scrapeAndExport);
// Node s'occupe de servir les fichiers statiques
app.use(express.static(path.resolve(__dirname, "../client/build")));

app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"))
});

app.listen(port, () => console.log(`Serveur en cours d'exécution sur le port ${port}`));

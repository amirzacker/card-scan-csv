// controllers/scraperController.js
const { scrapeData } = require('../services/scraperService');
const csvWriter = require('csv-write-stream');
const fs = require('fs');
const path = require('path');

async function scrapeAndExport(req, res) {
    const serialNumbers = req.body.serialNumbers;
    if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
        return res.status(400).json({ error: 'Veuillez fournir une liste de numéros de série.' });
    }

    try {
        const results = await scrapeData(serialNumbers);

        // Vérifier si des résultats ont été obtenus
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'Aucun résultat trouvé pour les numéros de série fournis.' });
        }

        // Écriture des données dans un fichier CSV
        const writer = csvWriter({
            headers: [
                'Nom du produit',
                'Description',
                'Stock',
                'Prix de départ',
                'Poids (en gr)',
                'URL des images (maximum 10, séparées par « I » )',
            ],
            sendHeaders: true,
            separator: ',',
        });

        const fileName = 'output.csv';
        const filePath = path.join(__dirname, '..', fileName);
        const fileStream = fs.createWriteStream(filePath);
        writer.pipe(fileStream);

        results.forEach(result => {
            writer.write([
                result.productName,
                result.description,
                result.stock,
                result.startingPrice,
                result.weight,
                result.imageUrls,
            ]);
        });

        // Indiquer que nous avons terminé d'écrire dans le flux
        writer.end();

        // Écouter l'événement 'finish' pour savoir quand l'écriture est terminée
        fileStream.on('finish', () => {
            // Envoyer le fichier CSV en réponse
            res.download(filePath, fileName, err => {
                if (err) {
                    console.error('Erreur lors de l\'envoi du fichier CSV:', err);
                    res.status(500).json({ error: 'Erreur lors de l\'envoi du fichier CSV.' });
                } else {
                    // Supprimer le fichier après envoi
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Erreur lors de la suppression du fichier CSV:', unlinkErr);
                        }
                    });
                }
            });
        });

        // Gérer les erreurs lors de l'écriture
        fileStream.on('error', (err) => {
            console.error('Erreur lors de l\'écriture du fichier CSV:', err);
            res.status(500).json({ error: 'Erreur lors de l\'écriture du fichier CSV.' });
        });

    } catch (error) {
        console.error('Erreur dans scrapeAndExport:', error);
        res.status(500).json({ error: error.toString() });
    }
}

module.exports = {
    scrapeAndExport,
};

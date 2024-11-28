// controllers/scraperController.js
const { scrapeData } = require('../services/scraperService');
const { stringify } = require('csv');
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

        const columns = [
            'Nom du produit',
            'Description',
            'Stock',
            'Prix de départ',
            'Poids (en gr)',
            'URL des images (maximum 10, séparées par « I » )',
        ];

        const data = results.map(result => ({
            'Nom du produit': result.productName,
            'Description': result.description,
            'Stock': result.stock,
            'Prix de départ': result.startingPrice,
            'Poids (en gr)': result.weight,
            'URL des images (maximum 10, séparées par « I » )': result.imageUrls,
        }));

        const fileName = 'output.csv';
        const filePath = path.join(__dirname, '..', fileName);

        // Configuration du générateur CSV
        const csvOptions = {
            header: true,
            columns: columns,
            delimiter: ';',
            quoted: true, // Entourer tous les champs de guillemets
            encoding: 'utf8',
        };

        // Génération du CSV
        stringify(data, csvOptions, (err, output) => {
            if (err) {
                console.error('Erreur lors de la génération du CSV:', err);
                res.status(500).json({ error: 'Erreur lors de la génération du CSV.' });
                return;
            }

            fs.writeFile(filePath, output, (err) => {
                if (err) {
                    console.error('Erreur lors de l\'écriture du fichier CSV:', err);
                    res.status(500).json({ error: 'Erreur lors de l\'écriture du fichier CSV.' });
                    return;
                }

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
        });

    } catch (error) {
        console.error('Erreur dans scrapeAndExport:', error);
        res.status(500).json({ error: error.toString() });
    }
}

module.exports = {
    scrapeAndExport,
};

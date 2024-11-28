// services/scraperService.js
const puppeteer = require('puppeteer');
const { uploadImageToSupabase } = require('./supabaseService');
const path = require('path');

async function scrapeData(serialNumbers) {
    const results = [];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    for (const serial of serialNumbers) {
        const url = `https://www.collectaura.com/cardsteps/view/card/?serialnumber=${serial}`;

        // Liste pour stocker les URLs des images
        const imageUrls = [];

        // Intercepter les réponses réseau
        await page.setRequestInterception(true);
        page.on('request', request => {
            request.continue();
        });

        page.on('response', response => {
            const request = response.request();
            if (request.resourceType() === 'image') {
                const imageUrl = response.url();
                // Vérifier si l'URL de l'image contient le numéro de série
                if (imageUrl.includes(serial) && !imageUrls.includes(imageUrl)) {
                    imageUrls.push(imageUrl);
                }
            }
        });

        await page.goto(url, { waitUntil: 'networkidle0' });

        // Attendre un peu pour s'assurer que toutes les requêtes réseau sont terminées
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extraire les données textuelles de la page
        const scrapedData = await page.evaluate(() => {
            const data = {};
            const rows = document.querySelectorAll('.card-data table tr');
            rows.forEach(row => {
                const headerCell = row.querySelector('th');
                const dataCell = row.querySelector('td');
                if (headerCell && dataCell) {
                    const key = headerCell.innerText.trim();
                    const value = dataCell.innerText.trim();
                    data[key] = value;
                }
            });
            return data;
        });

        // Télécharger et uploader les images vers Supabase
        const uploadedImageUrls = [];
        for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
            const extension = path.extname(new URL(imageUrl).pathname) || '.jpg';
            const imageName = `${serial}_${i}${extension}`;
            const publicUrl = await uploadImageToSupabase(imageUrl, imageName);
            if (publicUrl) {
                uploadedImageUrls.push(publicUrl);
            }
        }

        // Préparer les données pour le CSV
        const result = {
            productName: `[CA ${scrapedData['Note finale']}] ${scrapedData['Carte']} | ${scrapedData['Extension']}`,
            description: 'Etat vu en live',
            stock: '1',
            startingPrice: '1',
            weight: '60', // En grammes
            imageUrls: uploadedImageUrls.join(' I '),
        };

        results.push(result);
    }

    await browser.close();
    return results;
}

module.exports = {
    scrapeData,
};

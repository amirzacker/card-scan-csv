// services/supabaseService.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');

const supabaseRegion = process.env.SUPABASE_REGION;
const supabaseEndpoint = process.env.SUPABASE_ENDPOINT; // Utilisez la variable d'environnement
const supabaseBucket = process.env.SUPABASE_BUCKET;
const supabaseAccessKeyId = process.env.SUPABASE_ACCESS_KEY_ID;
const supabaseSecretAccessKey = process.env.SUPABASE_SECRET_ACCESS_KEY;

async function uploadImageToSupabase(imageUrl, imageName) {
    try {
        // Télécharger l'image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageData = response.data;
        const contentType = response.headers['content-type'] || 'application/octet-stream';

        // Configurer le client S3
        const s3Client = new S3Client({
            forcePathStyle: true,
            region: supabaseRegion,
            endpoint: supabaseEndpoint,
            credentials: {
                accessKeyId: supabaseAccessKeyId,
                secretAccessKey: supabaseSecretAccessKey,
            },
        });

        // Préparer la commande pour uploader l'objet
        const uploadParams = {
            Bucket: supabaseBucket,
            Key: imageName,
            Body: imageData,
            ContentType: contentType,
            // Supprimez 'ACL: public-read' car Supabase gère les permissions via les politiques
        };

        // Exécuter la commande d'upload
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Construire l'URL publique de l'image
        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${supabaseBucket}/${imageName}`;

        return publicUrl;
    } catch (err) {
        console.error("Erreur lors du téléchargement ou de l'upload de l'image:", err);
        return null;
    }
}

module.exports = {
    uploadImageToSupabase,
};

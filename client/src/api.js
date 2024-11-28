import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001', // Assurez-vous que cela correspond à l'URL de votre serveur
});

export default api;

// Dashboard.js
import React, { useState } from "react";
import api from "../api";
import './style.css';

const Dashboard = () => {
  const [serialNumbers, setSerialNumbers] = useState([""]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSerialNumberChange = (index, value) => {
    const newSerialNumbers = [...serialNumbers];
    newSerialNumbers[index] = value;

    // Validation : vérifiez que le numéro de série est numérique
    const newErrors = [...errors];
    if (!/^\d*$/.test(value)) {
      newErrors[index] = "Le numéro de série doit être numérique.";
    } else {
      newErrors[index] = null;
    }
    setErrors(newErrors);

    setSerialNumbers(newSerialNumbers);
  };

  const addSerialNumberField = () => {
    setSerialNumbers([...serialNumbers, ""]);
    setErrors([...errors, null]);
  };

  const removeSerialNumberField = (index) => {
    const newSerialNumbers = [...serialNumbers];
    const newErrors = [...errors];
    newSerialNumbers.splice(index, 1);
    newErrors.splice(index, 1);
    setSerialNumbers(newSerialNumbers);
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filtrer les numéros de série non vides
    const validSerialNumbers = serialNumbers.filter((num) => num.trim() !== "");

    if (validSerialNumbers.length === 0) {
      alert("Veuillez saisir au moins un numéro de série.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(
          "/scrape",
          { serialNumbers: validSerialNumbers },
          {
            responseType: "blob",
            headers: {
              Accept: "text/csv",
            },
          }
      );

      // Créer un objet URL pour le blob
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      // Créer un lien pour le téléchargement
      const link = document.createElement("a");
      link.href = url;

      // Extraire le nom du fichier des en-têtes de la réponse
      const contentDisposition = response.headers["content-disposition"];
      let fileName = "cartes_pokemon.csv";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSerialNumbers([""]);
      setErrors([]);
    } catch (error) {
      console.error("Erreur lors de la génération du CSV :", error);
      alert("Une erreur est survenue lors de la génération du CSV.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div>
        <h2>Carte Pokémon</h2>
        <form onSubmit={handleSubmit}>
          {serialNumbers.map((serial, index) => (
              <div key={index} className="serial-number-field">
                <input
                    type="text"
                    placeholder="Numéro de série"
                    value={serial}
                    onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                />
                {serialNumbers.length > 1 && (
                    <button
                        type="button"
                        onClick={() => removeSerialNumberField(index)}
                    >
                      Supprimer
                    </button>
                )}
                {errors[index] && <div className="error">{errors[index]}</div>}
              </div>
          ))}
          <button type="button" onClick={addSerialNumberField}>
            Ajouter un autre numéro
          </button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Génération en cours..." : "Générer le CSV"}
          </button>
        </form>

        {isLoading && (
            <div className="loading-indicator">
              <p>Génération du CSV en cours, veuillez patienter...</p>
            </div>
        )}
      </div>
  );
};

export default Dashboard;

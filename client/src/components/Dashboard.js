// Dashboard.js
import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import './style.css';
import QrScanner from 'qr-scanner';

const Dashboard = () => {
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState(null);

  // Références pour le scanner QR
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const [qrOn, setQrOn] = useState(true);

  // Fonction appelée lorsqu'un QR code est détecté
  const onScanSuccess = (result) => {
    if (result) {
      const data = result.data;
      // Extraire le numéro de série depuis l'URL du QR code
      try {
        const url = new URL(data);
        const serial = url.searchParams.get('serialnumber');
        if (serial) {
          if (!serialNumbers.includes(serial)) {
            setSerialNumbers([...serialNumbers, serial]);
            setErrors([...errors, null]);
            setShowScanner(false);
            setScanError(null);
          } else {
            setScanError("Ce numéro de série est déjà dans la liste.");
          }
        } else {
          setScanError("Le QR code ne contient pas de numéro de série valide.");
        }
      } catch (error) {
        setScanError("Le QR code n'est pas une URL valide.");
      }
    }
  };

  // Fonction appelée en cas d'échec du scan
  const onScanFail = (error) => {
    console.error(error);
    setScanError("Erreur lors de la lecture du QR code.");
  };

  useEffect(() => {
    if (showScanner && videoRef.current) {
      // Instancier le scanner QR
      scannerRef.current = new QrScanner(
          videoRef.current,
          onScanSuccess,
          {
            onDecodeError: onScanFail,
            highlightScanRegion: true,
            preferredCamera: 'environment', // Utiliser la caméra arrière
          }
      );

      // Démarrer le scanner QR
      scannerRef.current.start().catch((err) => {
        console.error(err);
        setQrOn(false);
      });
    }

    // Nettoyer à la fermeture du scanner
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  useEffect(() => {
    if (!qrOn) {
      alert(
          "La caméra est bloquée ou inaccessible. Veuillez autoriser l'accès à la caméra dans les permissions de votre navigateur et recharger la page."
      );
    }
  }, [qrOn]);

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
      document.body.removeChild(link);

      setSerialNumbers([]);
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

        {showScanner ? (
            <div className="qr-reader">
              <video ref={videoRef} style={{ width: '100%' }} />
              <button type="button" onClick={() => setShowScanner(false)}>
                Annuler le scan
              </button>
              {scanError && <div className="error">{scanError}</div>}
            </div>
        ) : (
            <form onSubmit={handleSubmit}>
              {serialNumbers.map((serial, index) => (
                  <div key={index} className="serial-number-field">
                    <input
                        type="text"
                        placeholder="Numéro de série"
                        value={serial}
                        onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => removeSerialNumberField(index)}
                    >
                      Supprimer
                    </button>
                    {errors[index] && <div className="error">{errors[index]}</div>}
                  </div>
              ))}
              <button type="button" onClick={addSerialNumberField}>
                Ajouter un autre numéro
              </button>
              <button type="button" onClick={() => setShowScanner(true)}>
                Scanner un QR code
              </button>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Génération en cours..." : "Générer le CSV"}
              </button>
            </form>
        )}

        {isLoading && (
            <div className="loading-indicator">
              <p>Génération du CSV en cours, veuillez patienter...</p>
            </div>
        )}
      </div>
  );
};

export default Dashboard;

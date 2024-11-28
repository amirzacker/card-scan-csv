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

  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, []);

  const extractPSASerialNumber = (url) => {
    // Extraction du numéro de série pour les URL PSA
    const psaMatch = url.match(/\/cert\/(\d+)\/?/);
    return psaMatch ? psaMatch[1] : null;
  };

  const initializeQrScanner = () => {
    if (videoRef.current) {
      scannerRef.current = new QrScanner(
          videoRef.current,
          handleScanSuccess,
          {
            onDecodeError: handleScanError,
            preferredCamera: 'environment',
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          }
      );

      scannerRef.current.start().catch((error) => {
        console.error('Erreur de démarrage du scanner:', error);
        setScanError("Impossible de démarrer le scanner QR. Vérifiez les permissions.");
      });
    }
  };

  const handleScanSuccess = (result) => {
    const scannedData = result.data;
    console.log('QR Code scanné:', scannedData);

    try {
      // Extraction du numéro de série PSA
      const serialNumber = extractPSASerialNumber(scannedData);

      if (serialNumber) {
        // Vérifier si le numéro de série est déjà dans la liste
        if (!serialNumbers.includes(serialNumber)) {
          setSerialNumbers(prev => [...prev, serialNumber]);
          setErrors(prev => [...prev, null]);

          if (scannerRef.current) {
            scannerRef.current.stop();
          }

          setShowScanner(false);
          setScanError(null);
        } else {
          setScanError("Ce numéro de série est déjà dans la liste.");
        }
      } else {
        setScanError("Numéro de série PSA non trouvé.");
      }
    } catch (error) {
      console.error('Erreur lors du traitement du QR code:', error);
      setScanError("Impossible de traiter le QR code.");
    }
  };

  const handleScanError = (error) => {
    console.error('Erreur de scan:', error);
    setScanError("Erreur lors de la lecture du QR code.");
  };

  const handleSerialNumberChange = (index, value) => {
    const newSerialNumbers = [...serialNumbers];
    const newErrors = [...errors];

    newSerialNumbers[index] = value;

    // Validation : vérifier que le numéro de série est numérique
    if (!/^\d*$/.test(value)) {
      newErrors[index] = "Le numéro de série doit être numérique.";
    } else {
      newErrors[index] = null;
    }

    setSerialNumbers(newSerialNumbers);
    setErrors(newErrors);
  };

  const addManualSerialNumber = () => {
    setSerialNumbers(prev => [...prev, ""]);
    setErrors(prev => [...prev, null]);
  };

  const removeSerialNumberField = (indexToRemove) => {
    setSerialNumbers(prev =>
        prev.filter((_, index) => index !== indexToRemove)
    );
    setErrors(prev =>
        prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

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

  const startQrScanner = () => {
    setShowScanner(true);
    setTimeout(initializeQrScanner, 100);
  };

  const stopQrScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setShowScanner(false);
    setScanError(null);
  };

  return (
      <div className="dashboard-container">
        <h2>Carte Pokémon - Numéros de Série</h2>

        {showScanner ? (
            <div className="qr-scanner-container">
              <video
                  ref={videoRef}
                  style={{ width: '100%', maxWidth: '500px' }}
                  className="qr-scanner-video"
              />
              <div className="scanner-controls">
                <button
                    type="button"
                    onClick={stopQrScanner}
                    className="cancel-scan-button"
                >
                  Annuler le scan
                </button>
              </div>
              {scanError && (
                  <div className="error-message">
                    {scanError}
                  </div>
              )}
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="serial-number-form">
              <div className="serial-numbers-list">
                {serialNumbers.map((serial, index) => (
                    <div key={index} className="serial-number-field">
                      <input
                          type="text"
                          placeholder="Numéro de série"
                          value={serial}
                          onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                          className="serial-number-input"
                      />
                      <button
                          type="button"
                          onClick={() => removeSerialNumberField(index)}
                          className="remove-field-button"
                      >
                        ✖
                      </button>
                      {errors[index] && (
                          <div className="error-message">{errors[index]}</div>
                      )}
                    </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                    type="button"
                    onClick={addManualSerialNumber}
                    className="add-serial-button"
                >
                  Ajouter un numéro manuellement
                </button>
                <button
                    type="button"
                    onClick={startQrScanner}
                    className="scan-qr-button"
                >
                  Scanner QR code PSA
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="generate-csv-button"
                >
                  {isLoading ? "Génération en cours..." : "Générer le CSV"}
                </button>
              </div>
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

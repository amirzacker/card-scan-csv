import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import './style.css';
import QrScanner from 'qr-scanner';

const Dashboard = () => {
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [scanMessageType, setScanMessageType] = useState('');

  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, []);

  const extractSerialNumber = (url) => {
    // Regex pour PSA Card
    const psaMatch = url.match(/\/cert\/(\d+)\/?/);
    if (psaMatch) return psaMatch[1];

    // Regex pour Collectaura
    const collectauraMatch = url.match(/serialnumber=(\d+)/);
    if (collectauraMatch) return collectauraMatch[1];

    return null;
  };

  // Check if serial number is unique
  const isSerialNumberUnique = (serialNumber) => {
    return !serialNumbers.includes(serialNumber);
  };

  // Initialize QR Scanner
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
        setScanMessage("Impossible de démarrer le scanner QR. Vérifiez les permissions.");
        setScanMessageType('error');
      });
    }
  };

  // Handle successful QR code scan
  const handleScanSuccess = (result) => {
    const scannedData = result.data;
    console.log('QR Code scanné:', scannedData);

    try {
      // Extract serial number
      const serialNumber = extractSerialNumber(scannedData);

      if (serialNumber) {
        // Check if serial number is unique
        if (isSerialNumberUnique(serialNumber)) {
          setSerialNumbers((prevSerialNumbers) => [...prevSerialNumbers, serialNumber]);
          setErrors((prevErrors) => [...prevErrors, null]);

          // Success message
          setScanMessage(`Numéro de série ${serialNumber} ajouté avec succès !`);
          setScanMessageType('success');

          // Automatically clear the success message after 3 seconds
          setTimeout(() => {
            setScanMessage(null);
          }, 3000);
        } else {
          setScanMessage(`Le numéro de série ${serialNumber} est déjà dans la liste.`);
          setScanMessageType('error');
        }
      } else {
        setScanMessage("Numéro de série non trouvé dans le QR code.");
        setScanMessageType('error');
      }
    } catch (error) {
      console.error('Erreur lors du traitement du QR code:', error);
      setScanMessage("Impossible de traiter le QR code.");
      setScanMessageType('error');
    }
  };

  // Handle scanner errors
  const handleScanError = (error) => {
    console.error('Erreur de scan:', error);
    setScanMessage("Erreur lors de la lecture du QR code.");
    setScanMessageType('error');
  };

  // Handle manual serial number input changes
  const handleSerialNumberChange = (index, value) => {
    const newSerialNumbers = [...serialNumbers];
    const newErrors = [...errors];

    newSerialNumbers[index] = value;

    // Validation: check if serial number is numeric
    if (!/^\d*$/.test(value)) {
      newErrors[index] = "Le numéro de série doit être numérique.";
    } else {
      // Check if the serial number is unique
      if (!isSerialNumberUnique(value)) {
        newErrors[index] = "Ce numéro de série est déjà dans la liste.";
      } else {
        newErrors[index] = null;
      }
    }

    setSerialNumbers(newSerialNumbers);
    setErrors(newErrors);
  };

  // Add a new manual serial number input field
  const addManualSerialNumber = () => {
    setSerialNumbers((prev) => [...prev, ""]);
    setErrors((prev) => [...prev, null]);
  };

  // Remove a serial number input field
  const removeSerialNumberField = (indexToRemove) => {
    setSerialNumbers((prev) =>
        prev.filter((_, index) => index !== indexToRemove)
    );
    setErrors((prev) =>
        prev.filter((_, index) => index !== indexToRemove)
    );
  };

  // Submit handler to generate CSV
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validSerialNumbers = serialNumbers.filter((num) => num.trim() !== "");

    if (validSerialNumbers.length === 0) {
      alert("Veuillez saisir au moins un numéro de série.");
      return;
    }

    // Check for unique serial numbers before submission
    const uniqueSerialNumbers = [...new Set(validSerialNumbers)];
    if (uniqueSerialNumbers.length !== validSerialNumbers.length) {
      alert("Certains numéros de série sont en double. Veuillez les supprimer.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(
          "/scrape",
          { serialNumbers: uniqueSerialNumbers },
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

  // Start QR scanner
  const startQrScanner = () => {
    setShowScanner(true);
    setScanMessage(null);
    setTimeout(initializeQrScanner, 100);
  };

  // Stop QR scanner
  const stopQrScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    setShowScanner(false);
    setScanMessage(null);
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
              {scanMessage && (
                  <div
                      className={`message-box ${
                          scanMessageType === 'error' ? 'error-message' : 'success-message'
                      }`}
                  >
                    {scanMessage}
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

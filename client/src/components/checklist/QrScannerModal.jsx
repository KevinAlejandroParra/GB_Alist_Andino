'use client';

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QrScannerModal({
   show,
   onClose,
   onScanSuccess,
   title = "Escanear Código QR"
 }) {
   const scannerRef = useRef(null);
   const successRef = useRef(false);

  useEffect(() => {
    if (show) {
      successRef.current = false;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: "environment" // Preferir cámara trasera
        }
      };

      const scanner = new Html5QrcodeScanner('qr-reader', config, false);
      scannerRef.current = scanner;

      const handleSuccess = (decodedText) => {
        if (successRef.current) return;
        successRef.current = true;
        if (scannerRef.current) {
          scannerRef.current.clear().then(() => {
            onScanSuccess(decodedText);
          }).catch(error => {
            console.error("Error al limpiar el escáner después del éxito.", error);
            onScanSuccess(decodedText);
          });
        }
      };

      const handleError = (error) => {
        // Ignorar errores comunes que no son críticos para la experiencia del usuario
        if (error && (error.includes('NotFoundException') || error.includes('Misdetection') || error.includes('No barcode or QR code detected'))) {
          return; // No hacer nada para estos errores esperados
        }
        // Para otros errores, sí mostrarlos en la consola
        console.error("Error del escáner QR:", error);
      };

      // Retrasar el inicio del escáner para dar tiempo a la cámara a inicializar
      const startScannerTimeout = setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.render(handleSuccess, handleError);
        }
      }, 500); // 500ms de retraso

      return () => {
        clearTimeout(startScannerTimeout);
        if (scannerRef.current) {
          try {
            scannerRef.current.clear().catch(err => console.error("Fallo al limpiar el escáner al desmontar:", err));
          } catch (err) {
            console.error("Excepción al limpiar el escáner:", err);
          }
          scannerRef.current = null;
        }
      };
    }
  }, [show, onScanSuccess]);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
       <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto">
         <div className="flex justify-between items-center p-5 border-b">
           <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
           {onClose && (
             <button
               onClick={onClose}
               className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
               aria-label="Cerrar modal"
             >
               ×
             </button>
           )}
         </div>
         <div className="p-6">
           <div id="qr-reader" className="w-full"></div>
           <div className="mt-4 space-y-2">
             <p className="text-center text-sm text-gray-600">
               📷 Apunta la cámara al código QR para escanearlo.
             </p>
           </div>
         </div>
         <div className="p-4 border-t bg-gray-50 rounded-b-lg">
           <div className="flex flex-col items-center gap-3">
             <button
               type="button"
               onClick={onClose}
               className="w-full px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
             >
               ✕ Cerrar Escáner
             </button>
             <div className="text-xs text-gray-500 text-center">
               🔒 Se necesita acceso a la cámara para escanear.
             </div>
           </div>
         </div>
       </div>
     </div>
   );
}
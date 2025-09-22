"use client";

import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import Swal from "sweetalert2";

const SignaturePad = ({ onSave, onClose, existingSignature }) => {
  const sigCanvas = useRef({});
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (existingSignature && sigCanvas.current) {
      sigCanvas.current.fromDataURL(existingSignature);
      setIsEmpty(false);
    }
  }, [existingSignature]);

  const clearSignature = () => {
    sigCanvas.current.clear();
    setIsEmpty(true);
  };

  const saveSignature = () => {
    if (sigCanvas.current.isEmpty()) {
      Swal.fire({
        title: "Firma Vacía",
        text: "Por favor, dibuja tu firma antes de guardar.",
        icon: "warning",
        confirmButtonColor: "#7c3aed",
        confirmButtonText: "Entendido",
        customClass: {
          popup: "rounded-2xl shadow-2xl",
          title: "text-slate-800 font-bold",
          content: "text-slate-600",
          confirmButton: "rounded-xl font-semibold px-6 py-3",
        },
      });
      return;
    }
    onSave(sigCanvas.current.toDataURL());
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-8 border w-full max-w-md md:max-w-lg lg:max-w-xl shadow-lg rounded-md bg-white">
        <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          Firma Digital
        </h3>
        <div className="border border-gray-300 rounded-md overflow-hidden mb-4">
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 200,
              className: "sigCanvas border-none",
            }}
            onBegin={handleBegin}
          />
        </div>
        <div className="flex justify-between space-x-4">
          <button
            onClick={clearSignature}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 font-semibold"
          >
            Limpiar
          </button>
          <button
            onClick={saveSignature}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 font-semibold"
          >
            Guardar Firma
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors duration-200 font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;

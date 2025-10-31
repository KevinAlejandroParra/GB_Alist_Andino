'use client';

import React from 'react';

export default function QrSystemStatus({ error, onRetry }) {
  const getErrorInfo = (error) => {
    if (error.includes('tablas QR no están creadas')) {
      return {
        title: 'Base de Datos no Configurada',
        message: 'Las tablas necesarias para el sistema QR no están creadas aún.',
        solution: 'Ejecute las migraciones de base de datos primero.',
        action: 'Ver Script de Instalación',
        actionType: 'migrations'
      };
    }

    if (error.includes('checklist_qr_codes')) {
      return {
        title: 'Tabla QR no Encontrada',
        message: 'La tabla de códigos QR no existe en la base de datos.',
        solution: 'Ejecute las migraciones específicas para tablas QR.',
        action: 'Ejecutar Migraciones',
        actionType: 'migrations'
      };
    }

    return {
      title: 'Error del Sistema QR',
      message: 'Ha ocurrido un error al cargar el sistema QR.',
      solution: 'Verifique la consola del servidor para más detalles.',
      action: 'Reintentar',
      actionType: 'retry'
    };
  };

  const errorInfo = getErrorInfo(error);

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">⚠️</span>
        </div>

        <div className="ml-3 flex-1">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            {errorInfo.title}
          </h3>

          <p className="text-yellow-700 mb-3">
            {errorInfo.message}
          </p>

          <p className="text-sm text-yellow-600 mb-4">
            <strong>Solución:</strong> {errorInfo.solution}
          </p>

          <div className="flex space-x-3">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              {errorInfo.action}
            </button>

            {errorInfo.actionType === 'migrations' && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const instructions = `
INSTRUCCIONES DE INSTALACIÓN DEL SISTEMA QR:

1. Abra una terminal en la carpeta 'server'
2. Ejecute las migraciones básicas:
   ./run-migrations.bat

3. Luego instale las dependencias:
   ./install-qr-dependencies.bat

4. Reinicie el servidor:
   npm start

Si los pasos anteriores fallan, puede ejecutar el setup completo:
./setup-qr-system.bat

Esto creará todas las tablas necesarias para el sistema QR.
                    `.trim();

                    alert(instructions);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Ver Instrucciones
                </button>

                <button
                  onClick={() => {
                    // Simular click en el script de migraciones
                    window.open('server/run-migrations.bat', '_blank');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Descargar Script
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
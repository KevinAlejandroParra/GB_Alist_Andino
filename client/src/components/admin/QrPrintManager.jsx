'use client';

import React from 'react';
import { useAuth } from '../AuthContext';

export default function QrPrintManager({ qrCodes, onRefresh }) {
  const { user } = useAuth();

  const activeQrCodes = qrCodes; 

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">📄 Gestión de Impresión</h3>
      
      {/* Información de códigos en un recuadro organizado */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
        <h4 className="font-medium text-gray-800 mb-4 flex items-center">
          📊 Información de Códigos
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Total de códigos:</strong>
              <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {qrCodes.length}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              <strong>Estado:</strong>
              <span className="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                {qrCodes.length > 0 ? 'Listos para imprimir' : 'No hay códigos'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-3"><strong>Tipos de atracción:</strong></p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(qrCodes.map(qr => qr.checklist_type_name))).map(type => (
                <span key={type} className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                  {type}
                </span>
              ))}
              {qrCodes.length === 0 && (
                <span className="text-sm text-gray-400 italic">No hay tipos disponibles</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botón principal de vista previa de impresión */}
      <div className="flex justify-center my-12">
        <button
          onClick={() => {
            // Crear ventana de impresión completamente optimizada
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
              <!DOCTYPE html>
              <html lang="es">
                <head>
                  <title>Códigos QR - Vista de Impresión</title>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    @page {
                      size: A4;
                      margin: 0.5cm;
                    }
                    
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    
                    body {
                      font-family: Arial, sans-serif;
                      font-size: 12px;
                      line-height: 1.2;
                      background: white;
                      color: black;
                    }
                    
                    .print-header {
                      text-align: center;
                      margin-bottom: 1rem;
                      border-bottom: 2px solid #333;
                      padding-bottom: 0.5rem;
                    }
                    
                    .print-header h1 {
                      font-size: 18px;
                      font-weight: bold;
                      margin-bottom: 0.25rem;
                    }
                    
                    .print-header .date {
                      font-size: 10px;
                      color: #666;
                    }
                    
                    .qr-grid {
                      display: grid;
                      grid-template-columns: repeat(3, 1fr);
                      gap: 0.75rem;
                      margin-bottom: 1rem;
                    }
                    
                    .qr-item {
                      border: 1px solid #ccc;
                      padding: 0.5rem;
                      text-align: center;
                      page-break-inside: avoid;
                    }
                    
                    .qr-title {
                      font-size: 10px;
                      font-weight: bold;
                      margin-bottom: 0.25rem;
                      line-height: 1.1;
                    }
                    
                    .qr-code {
                      width: 70px;
                      height: 70px;
                      margin: 0.25rem auto;
                      border: 1px solid #ccc;
                    }
                    
                    .qr-info {
                      font-size: 8px;
                      margin-top: 0.25rem;
                      color: #333;
                    }
                    
                    .print-footer {
                      text-align: center;
                      font-size: 8px;
                      color: #666;
                      border-top: 1px solid #ccc;
                      padding-top: 0.25rem;
                      margin-top: 0.5rem;
                    }
                    
                    @media print {
                      body {
                        background: white !important;
                      }
                      .qr-item {
                        page-break-inside: avoid;
                        break-inside: avoid;
                      }
                    }
                  </style>
                </head>
                <body>
                  <div class="print-header">
                    <h1>Códigos QR - Atracciones</h1>
                    <div class="date">Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</div>
                    <div class="date">Total de códigos: ${activeQrCodes.length}</div>
                  </div>
                  
                  <div class="qr-grid">
                    ${activeQrCodes.map((qr) => `
                      <div class="qr-item">
                        <div class="qr-title">${qr.attraction_name}</div>
                        <img src="${qr.qr_image_base64}" alt="QR ${qr.attraction_name}" class="qr-code" />
                        <div class="qr-info">
                          <div>Tipo: ${qr.checklist_type_name || 'N/A'}</div>
                          <div>Fecha: ${new Date().toLocaleDateString('es-ES')}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                  
                  <div class="print-footer">
                    <div>Códigos QR generados para impresión en papel A4</div>
                    <div>Optimizado para escaneo desde dispositivos móviles</div>
                  </div>
                </body>
              </html>
            `);
            printWindow.document.close();
            
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 500);
          }}
          disabled={activeQrCodes.length === 0}
          className="px-10 py-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          🖨️ Vista Previa de Impresión
        </button>
      </div>

      {/* Separador visual */}
      <div className="border-t border-gray-200 my-8"></div>

      {/* Información organizada en secciones */}
      <div className="space-y-6">
        {/* Consejos para impresión física */}
        <div className="p-6 bg-green-50 rounded-lg border border-green-200">
          <h5 className="font-medium text-green-800 mb-4 flex items-center">
            📋 Consejos para Impresión Física
          </h5>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h6 className="text-sm font-semibold text-green-700 mb-3">Materiales recomendados:</h6>
              <ul className="text-sm text-green-600 space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Papel adhesivo mate
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Tinta de alta calidad
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Impresora láser o inyección de tinta
                </li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-semibold text-green-700 mb-3">Configuración de impresión:</h6>
              <ul className="text-sm text-green-600 space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Calidad: Alta resolución
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Tamaño: Ajustar al 100%
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Márgenes: Mínimos
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Características técnicas */}
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="font-medium text-blue-800 mb-4 flex items-center">
            ⚙️ Características Técnicas
          </h5>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                📄
              </div>
              <h6 className="font-semibold text-blue-700 mb-1">Formato de impresión</h6>
              <p className="text-sm text-blue-600">Tamaño carta/A4 optimizado</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                🎨
              </div>
              <h6 className="font-semibold text-blue-700 mb-1">Diseño</h6>
              <p className="text-sm text-blue-600">Cuadrícula con información</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-3">
                📱
              </div>
              <h6 className="font-semibold text-blue-700 mb-1">Resolución</h6>
              <p className="text-sm text-blue-600">Alta calidad para escaneo móvil</p>
            </div>
          </div>
        </div>

        {/* Nota importante */}
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-3 text-lg">💡</span>
            <div>
              <h6 className="font-medium text-yellow-800 mb-1">Nota importante</h6>
              <p className="text-sm text-yellow-700">
                El botón "Vista Previa de Impresión" abre una ventana optimizada donde puedes 
                visualizar todos los códigos QR organizados para impresión. Desde esa vista puedes 
                usar las funciones de impresión del navegador para generar el PDF físico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
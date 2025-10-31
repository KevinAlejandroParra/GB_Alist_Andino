'use client';

import React from 'react';

export default function QrWelcomeScreen({ onStartGeneration }) {
 return (
   <div className="text-center py-12 px-6">
     <div className="max-w-4xl mx-auto">
       {/* Icono principal */}
       <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
         <span className="text-4xl">🎯</span>
       </div>

       {/* Título */}
       <h3 className="text-3xl font-bold text-gray-800 mb-4">
         ¡Sistema QR por Particiones!
       </h3>

       {/* Descripción */}
       <p className="text-gray-600 mb-8 text-lg">
         Genera códigos QR que validan grupos específicos de secciones dentro de un checklist de atracción,
         asegurando inspecciones más organizadas y control preciso de cada área.
       </p>

       {/* Beneficios */}
       <div className="grid md:grid-cols-3 gap-6 mb-8">
         <div className="text-center">
           <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
             <span className="text-xl">🎯</span>
           </div>
           <h4 className="font-semibold text-gray-800 mb-2">Control Específico</h4>
           <p className="text-sm text-gray-600">
             Cada código QR valida únicamente los items de su grupo asignado
           </p>
         </div>

         <div className="text-center">
           <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
             <span className="text-xl">📋</span>
           </div>
           <h4 className="font-semibold text-gray-800 mb-2">Inspecciones Organizadas</h4>
           <p className="text-sm text-gray-600">
             Divide checklists largos en grupos lógicos y controlables
           </p>
         </div>

         <div className="text-center">
           <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
             <span className="text-xl">⚡</span>
           </div>
           <h4 className="font-semibold text-gray-800 mb-2">Generación Inteligente</h4>
           <p className="text-sm text-gray-600">
             Crea múltiples códigos QR automáticamente según tus agrupaciones
           </p>
         </div>
       </div>

       {/* Cómo funciona */}
       <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
         <h4 className="font-semibold text-gray-800 mb-4">🎯 ¿Cómo Funcionan las Particiones?</h4>
         <div className="grid md:grid-cols-2 gap-6 text-left">
           <div>
             <h5 className="font-medium text-blue-900 mb-2">📝 Flujo de Trabajo:</h5>
             <div className="space-y-2 text-sm text-gray-700">
               <p><strong>1. Selecciona</strong> las secciones que vas a incluir</p>
               <p><strong>2. Configura</strong> cómo agruparlas</p>
               <p><strong>3. Genera</strong> códigos QR especializados</p>
             </div>
           </div>
           <div>
             <h5 className="font-medium text-green-900 mb-2">💡 Ejemplo Práctico:</h5>
             <div className="space-y-2 text-sm text-gray-700">
               <p>• Seleccionas 6 secciones</p>
               <p>• Configuras "Cada 2 items"</p>
               <p>• <strong>Resultado:</strong> 3 códigos QR especializados</p>
             </div>
           </div>
         </div>
       </div>

       {/* Cómo empezar - Actualizado */}
       <div className="bg-gray-50 rounded-lg p-6 mb-8">
         <h4 className="font-semibold text-gray-800 mb-4">🚀 ¿Cómo Empezar?</h4>
         <div className="space-y-4 text-left">
           <div className="flex items-start space-x-3">
             <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
             <div>
               <p className="font-medium text-gray-800 mb-1">Selecciona el tipo de checklist de atracción</p>
               <p className="text-sm text-gray-600">Elige el checklist que quieres dividir en grupos específicos</p>
             </div>
           </div>
           <div className="flex items-start space-x-3">
             <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
             <div>
               <p className="font-medium text-gray-800 mb-1">Elige las secciones que vas a incluir</p>
               <p className="text-sm text-gray-600">Selecciona únicamente las secciones que quieres incluir en los códigos QR</p>
             </div>
           </div>
           <div className="flex items-start space-x-3">
             <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
             <div>
               <p className="font-medium text-gray-800 mb-1">Configura cómo agrupar las secciones</p>
               <p className="text-sm text-gray-600">Define cada cuántos items padre crear un código QR (2, 3, 5, 10...)</p>
             </div>
           </div>
           <div className="flex items-start space-x-3">
             <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
             <div>
               <p className="font-medium text-gray-800 mb-1">Genera y descarga los códigos QR</p>
               <p className="text-sm text-gray-600">Cada código QR valida únicamente su grupo específico</p>
             </div>
           </div>
         </div>
       </div>

       {/* Ejemplo visual */}
       <div className="bg-white border rounded-lg p-6 mb-8">
         <h5 className="font-medium text-gray-800 mb-4">📊 Ejemplo Visual:</h5>
         <div className="space-y-3">
           <div className="flex items-center justify-center space-x-2">
             <div className="bg-green-100 px-3 py-2 rounded text-center min-w-[80px]">
               <div className="font-semibold text-green-800">QR-Grupo-1</div>
             </div>
             <span className="text-gray-400">→</span>
             <div className="bg-blue-100 px-2 py-1 rounded text-sm text-blue-800">secciones 1, 2</div>
           </div>
           <div className="flex items-center justify-center space-x-2">
             <div className="bg-green-100 px-3 py-2 rounded text-center min-w-[80px]">
               <div className="font-semibold text-green-800">QR-Grupo-2</div>
             </div>
             <span className="text-gray-400">→</span>
             <div className="bg-blue-100 px-2 py-1 rounded text-sm text-blue-800">secciones 3, 4</div>
           </div>
           <div className="flex items-center justify-center space-x-2">
             <div className="bg-green-100 px-3 py-2 rounded text-center min-w-[80px]">
               <div className="font-semibold text-green-800">QR-Grupo-3</div>
             </div>
             <span className="text-gray-400">→</span>
             <div className="bg-blue-100 px-2 py-1 rounded text-sm text-blue-800">secciones 5, 6</div>
           </div>
         </div>
         <p className="text-xs text-gray-500 mt-3">
           Cada código QR solo valida los items de su grupo específico
         </p>
       </div>

       {/* Botón de acción */}
       <button
         onClick={onStartGeneration}
         className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg"
       >
         ¡Comenzar con Particiones!
       </button>

       {/* Información adicional */}
       <div className="mt-6 text-sm text-gray-500">
         <p>💡 <strong>Tip:</strong> Selecciona todas las secciones del checklist y deja la etiqueta de particion vacia, si haces el proceso predeterminado.</p>
       </div>
     </div>
   </div>
 );
}
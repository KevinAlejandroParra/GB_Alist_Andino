'use client';

import React from 'react';

function QrProgressIndicator({
   qrValidationEnabled,
   totalQrPartitions,
   currentPartition,
   completedParentItems,
   qrScans = []
 }) {
   const completedQrScans = qrScans.length;
   const progressPercentage = totalQrPartitions > 1 ? (completedQrScans / totalQrPartitions) * 100 : 100;

   if (!qrValidationEnabled || totalQrPartitions <= 1) {
     return null;
   }

   return (
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
       <div className="flex items-center justify-between mb-2">
         <div className="flex items-center">
           <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
             <span className="text-blue-600 text-sm">📊</span>
           </div>
           <div>
             <h3 className="text-lg font-semibold text-blue-800">Progreso de Validación QR</h3>
             <p className="text-sm text-blue-600">
               {completedQrScans} de {totalQrPartitions} validaciones completadas
             </p>
           </div>
         </div>
         <div className="text-right">
           <div className="text-2xl font-bold text-blue-600">
             {completedQrScans}/{totalQrPartitions}
           </div>
           <div className="text-sm text-blue-500">QR completados</div>
         </div>
       </div>

       <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
         <div
           className="bg-blue-600 h-3 rounded-full transition-all duration-300"
           style={{ width: `${progressPercentage}%` }}
         ></div>
       </div>

       <div className="text-sm text-blue-700">
         {completedQrScans >= totalQrPartitions ? (
           <span className="font-semibold text-green-600">✅ Todas las validaciones QR completadas</span>
         ) : (
           <span>Faltan {totalQrPartitions - completedQrScans} validaciones QR más</span>
         )}
       </div>
     </div>
   );
 }

 function QrPartitionStatus({
   totalQrPartitions,
   currentPartition,
   qrScans = [],
   nextQrRequired = null
 }) {
   if (totalQrPartitions <= 1) {
     return null;
   }

   return (
     <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
       <div className="flex items-center mb-3">
         <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
           <span className="text-green-600 text-sm">🔓</span>
         </div>
         <div>
           <h3 className="text-lg font-semibold text-green-800">Estado de Particiones</h3>
           <p className="text-sm text-green-600">
             Gestión de secciones por validación QR
           </p>
         </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
         {Array.from({ length: totalQrPartitions }, (_, index) => {
           const partitionNumber = index + 1;
           const isCompleted = qrScans.some(scan => scan.current_partition_validated === partitionNumber);
           const isCurrent = partitionNumber === currentPartition;
           const isNextRequired = nextQrRequired && nextQrRequired.group_number === partitionNumber;

           return (
             <div
               key={partitionNumber}
               className={`p-2 rounded-lg text-center text-sm font-medium ${
                 isCompleted
                   ? 'bg-green-100 text-green-800 border border-green-300'
                   : isCurrent
                   ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                   : isNextRequired
                   ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                   : 'bg-gray-100 text-gray-600 border border-gray-200'
               }`}
             >
               <div>Partición {partitionNumber}</div>
               <div className="text-xs mt-1">
                 {isCompleted ? '✅ Completada' :
                  isCurrent ? '🔄 Actual' :
                  isNextRequired ? '⏳ Requerida' :
                  '⏸️ Pendiente'}
               </div>
             </div>
           );
         })}
       </div>

       {nextQrRequired && (
         <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-300">
           <div className="flex items-center justify-between">
             <div>
               <p className="text-sm font-semibold text-blue-800">
                 📱 Siguiente QR requerido:
               </p>
               <p className="text-xs text-blue-700 mt-1">
                 {nextQrRequired.qr_code}
                 {nextQrRequired.attraction_name && ` - ${nextQrRequired.attraction_name}`}
               </p>
             </div>
             <div className="text-right">
               <div className="text-xs text-blue-600">
                 Grupo {nextQrRequired.group_number}
               </div>
               <div className="text-xs text-blue-500 mt-1">
                 {nextQrRequired.reason}
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }

 // Componente para mostrar información de progreso mejorada
 function QrProgressInfo({
   completedParentItems,
   totalQrPartitions,
   qrScans = [],
   nextQrInfo = null
 }) {
   const completedQrScans = qrScans.length;
   const progressPercentage = totalQrPartitions > 1 ? (completedQrScans / totalQrPartitions) * 100 : 100;

   return (
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
       <div className="flex items-center justify-between mb-3">
         <div className="flex items-center">
           
         </div>
         </div>

       {nextQrInfo && nextQrInfo.isRequired && (
         <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
           <div className="flex items-center">
             <span className="text-yellow-600 mr-2">⚠️</span>
             <div>
               <p className="text-sm font-semibold text-yellow-800">
                 Se requiere autorización QR
               </p>
               <p className="text-xs text-yellow-700">
                 Escanea el código <strong>{nextQrInfo.qrCode}</strong> (Grupo {nextQrInfo.groupNumber})
               </p>
             </div>
           </div>
         </div>
       )}
      </div>
   );
 }

export default function QrScanHistory({
   qrScans,
   title = "Historial de Escaneos QR",
   qrValidationEnabled = false,
   totalQrPartitions = 1,
   currentPartition = 1,
   completedParentItems = 0,
   nextQrRequired = null,
   nextQrInfo = null
 }) {
    return (
      <>
        {/* Información mejorada de progreso */}
        <QrProgressInfo
          completedParentItems={completedParentItems}
          totalQrPartitions={totalQrPartitions}
          qrScans={qrScans}
          nextQrInfo={nextQrInfo}
        />

        {/* Indicador de progreso tradicional (mantenido por compatibilidad) */}
        <QrProgressIndicator
          qrValidationEnabled={qrValidationEnabled}
          totalQrPartitions={totalQrPartitions}
          currentPartition={currentPartition}
          completedParentItems={completedParentItems}
          qrScans={qrScans}
        />

        {/* Estado de particiones */}
        <QrPartitionStatus
          totalQrPartitions={totalQrPartitions}
          currentPartition={currentPartition}
          qrScans={qrScans}
          nextQrRequired={nextQrRequired}
        />

       {/* Historial de escaneos QR */}
       {qrScans && qrScans.length > 0 && (
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
           <div className="flex items-center mb-3">
             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
               <span className="text-blue-600 text-sm">📱</span>
             </div>
             <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
           </div>

           <div className="space-y-2">
             {qrScans.map((scan, index) => {
               const formattedDate = formatDateTime(scan.scanned_at);
               return (
                 <div
                   key={scan.scan_id}
                   className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                 >
                   <div className="flex items-center">
                     <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                       <span className="text-green-600 text-xs">✓</span>
                     </div>
                     <div>
                       <div className="text-sm font-medium text-gray-800">
                         {scan.qrCode?.attraction_name || 'Atracción'}
                       </div>
                       <div className="text-xs text-gray-500">
                         Ítems padre: {scan.parent_items_completed || scan.item_count_at_scan} |
                         Partición: {scan.current_partition_validated || 1}
                       </div>
                     </div>
                   </div>

                   <div className="text-right">
                     <div className="text-sm font-semibold text-gray-700">
                       {formattedDate.time}
                     </div>
                     <div className="text-xs text-gray-500">
                       {formattedDate.date}
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>

           {qrScans.length > 0 && (
             <div className="mt-3 pt-3 border-t border-gray-200">
               <div className="text-xs text-gray-600 text-center">
                 Total de escaneos: {qrScans.length}
               </div>
             </div>
           )}
         </div>
       )}
     </>
   );

  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      date: date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    };
  }
}
'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';

/**
 * Modal de Advertencia Legal y Autorización para Modo Soporte
 * Muestra advertencias sobre suplantación y requiere confirmación explícita
 */
export default function SupportAuthorizationModal({ 
  isOpen, 
  onClose, 
  onAuthorize, 
  impersonatedUser,
  checklistType 
}) {
  const [hasReadWarning, setHasReadWarning] = useState(false);
  const [hasUserPresent, setHasUserPresent] = useState(false);
  const [hasAuthorization, setHasAuthorization] = useState(false);
  const [acceptsResponsibility, setAcceptsResponsibility] = useState(false);
  const [fullName, setFullName] = useState('');
  const [document, setDocument] = useState('');

  if (!isOpen) return null;

  const canProceed = hasReadWarning && hasUserPresent && hasAuthorization && acceptsResponsibility && fullName.trim() && document.trim();

  const handleAuthorize = () => {
    if (!canProceed) {
      Swal.fire({
        title: 'Atención',
        text: 'Debes completar todos los campos y aceptar todas las condiciones',
        icon: 'warning'
      });
      return;
    }

    // Mostrar confirmación final
    Swal.fire({
      title: '⚠️ Confirmación Final',
      html: `
        <div class="text-left space-y-3">
          <p class="font-semibold text-red-600">Estás a punto de acceder al sistema como:</p>
          <p class="text-lg font-bold">${impersonatedUser.user_name}</p>
          <p class="text-sm text-gray-600">${impersonatedUser.role?.role_name}</p>
          <hr class="my-3"/>
          <p class="text-sm">Confirmas que:</p>
          <ul class="text-sm text-left list-disc pl-5 space-y-1">
            <li>El usuario está presente y ha autorizado esta acción</li>
            <li>Asumes toda responsabilidad legal</li>
            <li>Entiendes las implicaciones de esta acción</li>
          </ul>
          <p class="text-xs text-gray-500 mt-3">
            Autorizado por: <strong>${fullName}</strong> (${document})
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Autorizar Acceso',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        onAuthorize({
          fullName,
          document,
          timestamp: new Date().toISOString()
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <i className="fa fa-exclamation-triangle text-4xl"></i>
            <div>
              <h2 className="text-2xl font-bold">⚠️ ADVERTENCIA LEGAL</h2>
              <p className="text-red-100 text-sm mt-1">
                Autorización Requerida para Acceso en Modo Soporte
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información del usuario a impersonar */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">
              Vas a acceder como:
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                <i className="fa fa-user text-purple-700 text-xl"></i>
              </div>
              <div>
                <p className="font-bold text-lg">{impersonatedUser.user_name}</p>
                <p className="text-sm text-gray-600">{impersonatedUser.user_email}</p>
                <p className="text-sm text-purple-700 font-medium">
                  {impersonatedUser.role?.role_name} - {impersonatedUser.premise?.premise_name}
                </p>
              </div>
            </div>
          </div>

          {/* Advertencia de Suplantación */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <h3 className="font-bold text-red-900 text-lg mb-3 flex items-center gap-2">
              <i className="fa fa-gavel"></i>
              ADVERTENCIA SOBRE SUPLANTACIÓN
            </h3>
            <div className="space-y-2 text-sm text-red-800">
              <p className="font-semibold">
                La acción que estás a punto de realizar puede constituir SUPLANTACIÓN DE IDENTIDAD si se realiza sin la presencia y autorización explícita del usuario.
              </p>
              <p>
                Según el Código Penal Colombiano (Artículo 296), la suplantación de identidad es un delito que puede ser sancionado con pena de prisión de 3 a 8 años.
              </p>
              <p className="font-semibold text-red-900">
                Es OBLIGATORIO que el usuario <span className="underline">{impersonatedUser.user_name}</span> esté PRESENTE y haya AUTORIZADO esta acción.
              </p>
            </div>
          </div>

          {/* Condiciones de Uso */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <h3 className="font-bold text-yellow-900 text-lg mb-3 flex items-center gap-2">
              <i className="fa fa-clipboard-check"></i>
              CONDICIONES DE USO
            </h3>
            <ul className="space-y-2 text-sm text-yellow-900">
              <li className="flex items-start gap-2">
                <i className="fa fa-check-circle text-yellow-600 mt-1"></i>
                <span>Esta funcionalidad debe usarse ÚNICAMENTE para soporte técnico autorizado</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa fa-check-circle text-yellow-600 mt-1"></i>
                <span>El usuario debe estar presente físicamente o conectado por videollamada</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa fa-check-circle text-yellow-600 mt-1"></i>
                <span>Todas las acciones quedan registradas y son auditables</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa fa-check-circle text-yellow-600 mt-1"></i>
                <span>El mal uso de esta funcionalidad puede resultar en acciones legales</span>
              </li>
            </ul>
          </div>

          {/* Checkboxes de Confirmación */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={hasReadWarning}
                onChange={(e) => setHasReadWarning(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm">
                He leído y entendido completamente la advertencia legal sobre suplantación de identidad
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={hasUserPresent}
                onChange={(e) => setHasUserPresent(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-semibold">
                Confirmo que el usuario <span className="text-purple-700">{impersonatedUser.user_name}</span> está PRESENTE (físicamente o por videollamada) en este momento
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={hasAuthorization}
                onChange={(e) => setHasAuthorization(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-semibold">
                Confirmo que el usuario ha AUTORIZADO explícitamente esta acción
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={acceptsResponsibility}
                onChange={(e) => setAcceptsResponsibility(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm font-semibold text-red-700">
                Acepto TODA la responsabilidad legal derivada de esta acción y eximo a la empresa de cualquier responsabilidad por el uso indebido de esta funcionalidad
              </span>
            </label>
          </div>

          {/* Datos del Autorizador */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">
              Datos del Personal de Soporte que Autoriza
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documento de Identidad *
                </label>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Número de documento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Disclaimer Final */}
          <div className="bg-gray-100 border-l-4 border-gray-500 p-4 text-xs text-gray-700">
            <p className="font-semibold mb-1">NOTA IMPORTANTE:</p>
            <p>
              Al hacer clic en "Autorizar Acceso", declaras bajo juramento que toda la información proporcionada es verdadera y que cumples con todas las condiciones establecidas. Esta autorización quedará registrada en el sistema con fecha, hora y tus datos personales.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            <i className="fa fa-times mr-2"></i>
            Cancelar
          </button>
          <button
            onClick={handleAuthorize}
            disabled={!canProceed}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              canProceed
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <i className="fa fa-check-circle mr-2"></i>
            Autorizar Acceso
          </button>
        </div>
      </div>
    </div>
  );
}

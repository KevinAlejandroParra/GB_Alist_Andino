'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function RetroactiveSignatureManagement() {
  const [unsignedChecklists, setUnsignedChecklists] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('unsigned'); // 'unsigned' o 'history'
  
  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    checklistTypeId: '',
    premiseId: ''
  });

  useEffect(() => {
    loadUnsignedChecklists();
    loadAvailableUsers();
    loadHistory();
  }, []);

  const loadUnsignedChecklists = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams();
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.checklistTypeId) queryParams.append('checklistTypeId', filters.checklistTypeId);
      if (filters.premiseId) queryParams.append('premiseId', filters.premiseId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/retroactive-signatures/unsigned-checklists?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Error al cargar checklists');

      const data = await response.json();
      setUnsignedChecklists(data.checklists || []);
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'No se pudieron cargar los checklists sin firma', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/retroactive-signatures/available-admins`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/retroactive-signatures/history?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Error al cargar historial');

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAddSignature = async (checklistId, missingRoles, existingSignatures) => {
    // Filtrar usuarios solo de los roles que faltan
    const roleMap = {
      'Administrador': 1,
      'Técnico': 3,
      'Anfitrión': 4
    };
    
    const allowedRoleIds = missingRoles.map(roleName => roleMap[roleName]);
    const filteredUsers = availableUsers.filter(user => allowedRoleIds.includes(user.role_id));

    if (filteredUsers.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin usuarios disponibles',
        text: 'No hay usuarios disponibles para los roles faltantes',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Paso 1: Seleccionar usuario y fecha
    const { value: formValues } = await Swal.fire({
      title: 'Agregar Firma Retroactiva',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
            <p class="text-sm text-blue-700">
              <strong>ℹ️ Firmas faltantes:</strong> ${missingRoles.join(', ')}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Usuario que firmará:
            </label>
            <select id="user-select" class="swal2-input w-full">
              <option value="">Seleccione un usuario...</option>
              ${filteredUsers.map(user => 
                `<option value="${user.user_id}" data-role="${user.role_id}" data-name="${user.user_name}">${user.user_name} - ${user.role?.role_name || 'Sin rol'} (${user.user_email})</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Fecha y hora de la firma:
            </label>
            <input 
              type="datetime-local" 
              id="signature-date" 
              class="swal2-input w-full"
              value="${new Date().toISOString().slice(0, 16)}"
            />
            <p class="text-xs text-gray-500 mt-1">
              Especifique la fecha y hora en que se realizó la firma
            </p>
          </div>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-4">
            <p class="text-sm text-yellow-700">
              <strong>⚠️ Advertencia:</strong> En el siguiente paso, pase la tablet al usuario para que firme.
            </p>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Continuar a Firma',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      width: '600px',
      preConfirm: () => {
        const userSelect = document.getElementById('user-select');
        const userId = userSelect.value;
        const roleId = userSelect.options[userSelect.selectedIndex]?.getAttribute('data-role');
        const userName = userSelect.options[userSelect.selectedIndex]?.getAttribute('data-name');
        const signatureDate = document.getElementById('signature-date').value;

        if (!userId) {
          Swal.showValidationMessage('Debe seleccionar un usuario');
          return false;
        }

        if (!signatureDate) {
          Swal.showValidationMessage('Debe especificar la fecha de la firma');
          return false;
        }

        return { userId, roleId, userName, signatureDate };
      }
    });

    if (!formValues) return;

    // Paso 2: Modal de firma con canvas
    const { value: signatureData } = await Swal.fire({
      title: `Firma de ${formValues.userName}`,
      html: `
        <div class="text-left space-y-4">
          <p class="text-sm text-gray-600 mb-4">
            Por favor, firme en el recuadro a continuación:
          </p>
          <div class="border-2 border-gray-300 rounded-lg overflow-hidden">
            <canvas id="signature-canvas" width="500" height="200" style="touch-action: none; cursor: crosshair;"></canvas>
          </div>
          <div class="flex justify-between mt-2">
            <button id="clear-signature" class="text-sm text-red-600 hover:text-red-800">
              <i class="fas fa-eraser mr-1"></i> Limpiar
            </button>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'Guardar Firma',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      didOpen: () => {
        const canvas = document.getElementById('signature-canvas');
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        // Configurar canvas
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const startDrawing = (e) => {
          isDrawing = true;
          const rect = canvas.getBoundingClientRect();
          const x = (e.clientX || e.touches[0].clientX) - rect.left;
          const y = (e.clientY || e.touches[0].clientY) - rect.top;
          lastX = x;
          lastY = y;
        };

        const draw = (e) => {
          if (!isDrawing) return;
          e.preventDefault();
          
          const rect = canvas.getBoundingClientRect();
          const x = (e.clientX || e.touches[0].clientX) - rect.left;
          const y = (e.clientY || e.touches[0].clientY) - rect.top;

          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x, y);
          ctx.stroke();

          lastX = x;
          lastY = y;
        };

        const stopDrawing = () => {
          isDrawing = false;
        };

        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch events
        canvas.addEventListener('touchstart', startDrawing);
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', stopDrawing);

        // Botón limpiar
        document.getElementById('clear-signature').addEventListener('click', () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
      },
      preConfirm: () => {
        const canvas = document.getElementById('signature-canvas');
        const signatureImage = canvas.toDataURL('image/png');
        
        // Verificar que hay algo dibujado
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasDrawing = imageData.data.some(channel => channel !== 0);
        
        if (!hasDrawing) {
          Swal.showValidationMessage('Debe firmar en el recuadro');
          return false;
        }

        return signatureImage;
      }
    });

    if (!signatureData) return;

    // Paso 3: Guardar firma
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API}/api/retroactive-signatures/${checklistId}/sign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: parseInt(formValues.userId),
            role_id: parseInt(formValues.roleId),
            signed_at: formValues.signatureDate,
            signature_image: signatureData
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al agregar firma');
      }

      // Paso 4: Mostrar éxito y opción de descargar PDF
      const result = await Swal.fire({
        icon: 'success',
        title: '¡Firma Agregada!',
        html: `
          <p>Firma retroactiva agregada exitosamente por ${data.signature.signed_by}</p>
          <div class="mt-4">
            <button id="download-pdf-btn" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <i class="fas fa-file-pdf mr-2"></i>
              <span id="btn-text">Descargar PDF del Checklist</span>
            </button>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#10b981',
        didOpen: () => {
          const downloadBtn = document.getElementById('download-pdf-btn');
          const btnText = document.getElementById('btn-text');
          let isDownloading = false;

          downloadBtn.addEventListener('click', async () => {
            // Prevenir múltiples clics
            if (isDownloading) return;
            
            try {
              isDownloading = true;
              downloadBtn.disabled = true;
              
              // Mostrar spinner
              btnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generando PDF...';

              const pdfResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API}/api/checklists/${checklistId}/download`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                }
              );

              if (!pdfResponse.ok) throw new Error('Error al descargar PDF');

              const blob = await pdfResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `checklist-${checklistId}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);

              // Restaurar botón
              btnText.innerHTML = '<i class="fas fa-check mr-2"></i>PDF Descargado';
              downloadBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
              downloadBtn.classList.add('bg-green-500');

              Swal.fire({
                icon: 'success',
                title: 'PDF Descargado',
                text: 'El PDF se ha descargado correctamente',
                timer: 2000,
                showConfirmButton: false
              });
            } catch (error) {
              console.error('Error al descargar PDF:', error);
              
              // Restaurar botón en caso de error
              btnText.innerHTML = '<i class="fas fa-file-pdf mr-2"></i>Descargar PDF del Checklist';
              downloadBtn.disabled = false;
              isDownloading = false;
              
              Swal.fire('Error', 'No se pudo descargar el PDF. Por favor, intente nuevamente.', 'error');
            }
          });
        }
      });

      // Recargar datos
      loadUnsignedChecklists();
      loadHistory();

    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-signature"></i>
          Gestión de Firmas Retroactivas
        </h2>
        <p className="mt-2 text-yellow-50">
          Administra checklists que requieren firma de administrador retroactiva
        </p>
        <div className="mt-3 bg-yellow-600 bg-opacity-30 p-3 rounded">
          <p className="text-sm flex items-center gap-2">
            <i className="fas fa-shield-alt"></i>
            <strong>Acceso Restringido:</strong> Solo personal de Soporte puede usar esta funcionalidad
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('unsigned')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'unsigned'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Checklists Sin Firma ({unsignedChecklists.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'history'
              ? 'border-b-2 border-orange-500 text-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fas fa-history mr-2"></i>
          Historial de Firmas Retroactivas ({history.length})
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'unsigned' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-700">
              <i className="fas fa-filter mr-2"></i>
              Filtros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={loadUnsignedChecklists}
                  className="w-full bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                >
                  <i className="fas fa-search mr-2"></i>
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Lista de checklists sin firma */}
          {loading ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-orange-500"></i>
              <p className="mt-4 text-gray-600">Cargando checklists...</p>
            </div>
          ) : unsignedChecklists.length === 0 ? (
            <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
              <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
              <p className="text-lg font-medium text-green-700">
                ¡Excelente! No hay checklists pendientes de firma
              </p>
              <p className="text-sm text-green-600 mt-2">
                Todos los checklists tienen las firmas requeridas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Tipo de Checklist
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Sede
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Inspectable
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Creado Por
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Fecha Creación
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {unsignedChecklists.map((checklist) => (
                    <tr key={checklist.checklist_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        #{checklist.checklist_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {checklist.checklist_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {checklist.premise}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {checklist.inspectable}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {checklist.created_by}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(checklist.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {/* Mostrar solo las firmas requeridas según el tipo de checklist */}
                          {checklist.required_roles?.includes(1) && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              checklist.signatures?.hasAdmin 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {checklist.signatures?.hasAdmin ? '✓' : '✗'} Admin
                            </span>
                          )}
                          {checklist.required_roles?.includes(3) && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              checklist.signatures?.hasTechnician 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {checklist.signatures?.hasTechnician ? '✓' : '✗'} Técnico
                            </span>
                          )}
                          {checklist.required_roles?.includes(4) && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              checklist.signatures?.hasAnfitrion 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {checklist.signatures?.hasAnfitrion ? '✓' : '✗'} Anfitrión
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleAddSignature(checklist.checklist_id, checklist.missing_roles, checklist.signatures)}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
                          disabled={checklist.missing_roles?.length === 0}
                        >
                          <i className="fas fa-signature mr-2"></i>
                          Agregar Firma
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab de Historial */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <i className="fas fa-info-circle mr-2"></i>
              Este historial muestra todas las firmas retroactivas agregadas al sistema con fines de auditoría.
            </p>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <i className="fas fa-inbox text-5xl text-gray-400 mb-4"></i>
              <p className="text-lg font-medium text-gray-600">
                No hay registros en el historial
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Checklist ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Firmado Por
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((record) => {
                    const getRoleName = (roleId) => {
                      switch(roleId) {
                        case 1: return 'Administrador';
                        case 3: return 'Técnico';
                        case 4: return 'Anfitrión';
                        default: return 'Desconocido';
                      }
                    };
                    
                    const getRoleColor = (roleId) => {
                      switch(roleId) {
                        case 1: return 'bg-purple-100 text-purple-800';
                        case 3: return 'bg-blue-100 text-blue-800';
                        case 4: return 'bg-green-100 text-green-800';
                        default: return 'bg-gray-100 text-gray-800';
                      }
                    };

                    return (
                      <tr key={record.signature_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          #{record.checklist_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.checklist_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {record.signed_by}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(record.role_id)}`}>
                            {getRoleName(record.role_id)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(record.signed_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

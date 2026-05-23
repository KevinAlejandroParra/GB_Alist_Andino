'use client';
import { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import SupportAuthorizationModal from './SupportAuthorizationModal';

export default function SupportChecklistManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Datos base
  const [checklistTypes, setChecklistTypes] = useState([]);
  const [premises, setPremises] = useState([]);
  const [users, setUsers] = useState([]);
  const [inspectables, setInspectables] = useState([]);

  // Selecciones paso 1
  const [selectedTypeCategory, setSelectedTypeCategory] = useState('');
  const [selectedPremise, setSelectedPremise] = useState('');
  const [selectedChecklistType, setSelectedChecklistType] = useState(null);

  // Selecciones paso 2
  const [selectedInspectable, setSelectedInspectable] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  // Checklist retroactivo
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [checklistDate, setChecklistDate] = useState('');
  const [weekIdentifier, setWeekIdentifier] = useState('');

  // Lista de checklists existentes
  const [existingChecklists, setExistingChecklists] = useState([]);
  const [showExistingChecklists, setShowExistingChecklists] = useState(false);

  // Filtros para la lista de checklists existentes
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterOnlySupport, setFilterOnlySupport] = useState(false);
  const [filterStatus, setFilterStatus] = useState(''); // '' | 'complete' | 'incomplete'
  const [filterSearch, setFilterSearch] = useState('');

  // Modal de autorización
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingChecklist, setPendingChecklist] = useState(null);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [typesRes, premisesRes] = await Promise.all([
        axiosInstance.get('/api/support/types'),
        axiosInstance.get('/api/premises'),
      ]);
      setChecklistTypes(typesRes.data.data || []);
      const premisesData = Array.isArray(premisesRes.data)
        ? premisesRes.data
        : (premisesRes.data.data || []);
      setPremises(premisesData);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      Swal.fire('Error', 'No se pudieron cargar los datos iniciales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      // Checklists de familia → anfitriones (role_id: 4)
      if (selectedChecklistType?.type_category === 'family') {
        params.role_id = 4;
      } else if (selectedChecklistType?.role_id) {
        params.role_id = selectedChecklistType.role_id;
      }
      if (selectedPremise) params.premise_id = selectedPremise;
      const response = await axiosInstance.get('/api/support/users', { params });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInspectables = (checklistTypeId) => {
    const type = checklistTypes.find(t => t.checklist_type_id === checklistTypeId);
    if (type?.inspectables?.length > 0) {
      const filtered = selectedPremise
        ? type.inspectables.filter(i => i.premise_id === parseInt(selectedPremise))
        : type.inspectables;
      setInspectables(filtered);
    } else {
      setInspectables([]);
    }
  };

  const loadExistingChecklists = async () => {
    try {
      setLoading(true);
      const params = { checklist_type_id: selectedChecklistType.checklist_type_id };
      if (selectedPremise) params.premise_id = selectedPremise;
      if (selectedInspectable) params.inspectable_id = selectedInspectable;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const response = await axiosInstance.get('/api/support/checklists', { params });
      setExistingChecklists(response.data.data || []);
      setShowExistingChecklists(true);
    } catch (error) {
      console.error('Error cargando checklists existentes:', error);
      Swal.fire('Error', 'No se pudieron cargar los checklists existentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado local de la lista de checklists existentes
  const filteredExistingChecklists = useMemo(() => {
    return existingChecklists.filter(c => {
      if (filterOnlySupport && !c.created_by_support) return false;
      if (filterStatus === 'complete' && !c.is_complete) return false;
      if (filterStatus === 'incomplete' && c.is_complete) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const matchId = String(c.checklist_id).includes(q);
        const matchUser = c.creator?.user_name?.toLowerCase().includes(q);
        const matchWeek = c.week_identifier?.toLowerCase().includes(q);
        const matchNotes = c.support_notes?.toLowerCase().includes(q);
        if (!matchId && !matchUser && !matchWeek && !matchNotes) return false;
      }
      return true;
    });
  }, [existingChecklists, filterOnlySupport, filterStatus, filterSearch]);


  const handleChecklistTypeSelect = (type) => {
    setSelectedChecklistType(type);
    loadInspectables(type.checklist_type_id);
    setStep(2);
  };

  const handleCreateNewChecklist = () => {
    if (!selectedUser) return;
    setPendingAction('create');
    setShowAuthModal(true);
  };

  const handleAccessExistingChecklist = async (checklist) => {
    const userToImpersonate = selectedUser || checklist.creator;
    if (!userToImpersonate) {
      Swal.fire('Atención', 'Debes seleccionar un usuario para continuar', 'warning');
      return;
    }
    if (selectedUser && selectedUser.user_id !== checklist.creator?.user_id) {
      const confirm = await Swal.fire({
        title: 'Confirmar usuario',
        html: `Vas a acceder como <strong>${selectedUser.user_name}</strong>, pero fue creado por <strong>${checklist.creator?.user_name}</strong>. ¿Continuar?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirm.isConfirmed) return;
    }
    setPendingAction('access');
    setPendingChecklist({ ...checklist, _impersonate_user: userToImpersonate });
    setShowAuthModal(true);
  };

  const handleAuthorizationGranted = async (authData) => {
    setShowAuthModal(false);
    sessionStorage.setItem('support_authorization', JSON.stringify(authData));
    if (pendingAction === 'create') await executeCreateChecklist(authData);
    else if (pendingAction === 'access') await executeAccessChecklist(pendingChecklist, authData);
    setPendingAction(null);
    setPendingChecklist(null);
  };

  const executeCreateChecklist = async (authData) => {
    try {
      setLoading(true);
      const payload = {
        impersonate_user_id: selectedUser.user_id,
        inspectableId: selectedInspectable || null,
        authorization_data: authData,
      };
      if (isRetroactive && checklistDate) payload.checklist_date = new Date(checklistDate).toISOString();
      if (weekIdentifier) payload.week_identifier = weekIdentifier;

      const response = await axiosInstance.post(
        `/api/support/checklists/type/${selectedChecklistType.checklist_type_id}/create`,
        payload
      );
      if (response.data.success) {
        Swal.fire({
          title: '¡Éxito!',
          html: `<p>Accediendo como <strong>${selectedUser.user_name}</strong></p>${isRetroactive ? '<p class="text-sm text-orange-600 mt-2">⚠️ Checklist retroactivo creado</p>' : ''}`,
          icon: 'success',
          confirmButtonText: 'Continuar'
        }).then(() => navigateToChecklist(response.data.data));
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error || 'No se pudo crear el checklist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeAccessChecklist = async (checklist, authData) => {
    try {
      setLoading(true);
      const userToImpersonate = checklist._impersonate_user || selectedUser;
      const response = await axiosInstance.post(
        `/api/support/checklists/${checklist.checklist_id}/access`,
        { impersonate_user_id: userToImpersonate.user_id, authorization_data: authData }
      );
      if (response.data.success) {
        Swal.fire({
          title: '¡Acceso concedido!',
          html: `<p>Accediendo como <strong>${userToImpersonate.user_name}</strong></p>`,
          icon: 'success', timer: 2000, showConfirmButton: false
        }).then(() => navigateToChecklist(response.data.data));
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.error || 'No se pudo acceder al checklist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const navigateToChecklist = (checklistData) => {
    sessionStorage.setItem('support_context', JSON.stringify(checklistData.support_context));
    const typeCategory = checklistData.type?.type_category;
    const typeId = checklistData.type?.checklist_type_id || checklistData.checklist_type_id;
    const id = checklistData.checklist_id;
    const routes = {
      attraction: `/checklists/attraction/${typeId}?checklist_id=${id}`,
      family: `/checklists/family/${typeId}?checklist_id=${id}`,
      premios: `/checklists/premios/${typeId}?checklist_id=${id}`,
    };
    router.push(routes[typeCategory] || `/checklists/detail/${typeId}?checklist_id=${id}`);
  };

  const resetSelection = () => {
    setStep(1);
    setSelectedChecklistType(null);
    setSelectedUser(null);
    setSelectedInspectable('');
    setUsers([]);
    setUserSearch('');
    setExistingChecklists([]);
    setShowExistingChecklists(false);
    setIsRetroactive(false);
    setChecklistDate('');
    setWeekIdentifier('');
  };

  const filteredChecklistTypes = selectedTypeCategory
    ? checklistTypes.filter(t => t.type_category === selectedTypeCategory)
    : checklistTypes;

  const filteredUsers = userSearch
    ? users.filter(u => u.user_name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.user_email.toLowerCase().includes(userSearch.toLowerCase()))
    : users;

  const categories = [
    { value: 'attraction', label: 'Atracciones', icon: '🎢' },
    { value: 'family', label: 'Familias', icon: '👨‍👩‍👧‍👦' },
    { value: 'premios', label: 'Premios', icon: '🎁' },
    { value: 'other', label: 'Otros', icon: '📋' },
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fa fa-user-shield"></i>
          Soporte de Checklists
        </h2>
        <p className="mt-2 text-purple-100">Accede a cualquier checklist y diligencia respuestas como otro usuario</p>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center space-x-4">
        {[{ n: 1, label: 'Seleccionar Checklist' }, { n: 2, label: 'Seleccionar Usuario' }, { n: 3, label: 'Acceder' }].map(({ n, label }, i, arr) => (
          <React.Fragment key={n}>
            <div className={`flex items-center ${step >= n ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= n ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>{n}</div>
              <span className="ml-2 font-medium hidden sm:inline">{label}</span>
            </div>
            {i < arr.length - 1 && <div className="w-12 h-1 bg-gray-300"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* ── PASO 1: Tipo de checklist ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-base font-semibold mb-3">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={selectedTypeCategory} onChange={e => setSelectedTypeCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Todas las categorías</option>
                  {categories.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                <select value={selectedPremise} onChange={e => setSelectedPremise(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Todas las sedes</option>
                  {premises.map(p => <option key={p.premise_id} value={p.premise_id}>{p.premise_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-base font-semibold mb-3">
              Tipos de Checklist Disponibles
              <span className="ml-2 text-sm font-normal text-gray-500">({filteredChecklistTypes.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChecklistTypes.map(type => (
                <div key={type.checklist_type_id} onClick={() => handleChecklistTypeSelect(type)}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-lg cursor-pointer transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{type.name}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{type.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{type.type_category}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{type.role?.role_name}</span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{type.frequency}</span>
                      </div>
                    </div>
                    <i className="fa fa-chevron-right text-gray-400 ml-2 mt-1"></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 2: Usuario + acciones ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Info del tipo seleccionado */}
          <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">{selectedChecklistType?.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{selectedChecklistType?.type_category}</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{selectedChecklistType?.role?.role_name}</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">{selectedChecklistType?.frequency}</span>
              </div>
            </div>
            <button onClick={resetSelection} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
              <i className="fa fa-arrow-left"></i> Cambiar
            </button>
          </div>

          {/* Inspectable si aplica */}
          {inspectables.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {selectedChecklistType?.type_category === 'attraction' ? 'Atracción' : 'Elemento'}
              </label>
              <select value={selectedInspectable} onChange={e => setSelectedInspectable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">Seleccione...</option>
                {inspectables.map(i => <option key={i.ins_id} value={i.ins_id}>{i.name} — {i.premise?.premise_name}</option>)}
              </select>
            </div>
          )}

          {/* Cargar / buscar usuarios */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">
                Seleccionar Usuario
                {selectedUser && <span className="ml-2 text-sm text-purple-600 font-normal">✓ {selectedUser.user_name}</span>}
              </h3>
              {users.length === 0
                ? <button onClick={loadUsers} disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-400">
                    {loading ? 'Cargando...' : 'Cargar usuarios'}
                  </button>
                : <button onClick={() => { setUsers([]); setSelectedUser(null); setUserSearch(''); }}
                    className="text-xs text-gray-500 hover:text-red-600">
                    <i className="fa fa-times mr-1"></i>Limpiar
                  </button>
              }
            </div>
            {users.length > 0 && (
              <>
                <input type="text" placeholder="Buscar por nombre o email..." value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <div key={u.user_id} onClick={() => setSelectedUser(u)}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedUser?.user_id === u.user_id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="fa fa-user text-purple-600 text-sm"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{u.user_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.user_email}</p>
                          <div className="mt-1 flex gap-1 flex-wrap">
                            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{u.role?.role_name}</span>
                            {u.premise?.premise_name && <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{u.premise.premise_name}</span>}
                          </div>
                        </div>
                        {selectedUser?.user_id === u.user_id && <i className="fa fa-check-circle text-purple-600"></i>}
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && <p className="col-span-2 text-center text-sm text-gray-500 py-4">Sin resultados</p>}
                </div>
              </>
            )}
          </div>

          {/* Checklist retroactivo */}
          {selectedUser && (
            <div className="bg-white p-4 rounded-lg shadow">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRetroactive} onChange={e => setIsRetroactive(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded" />
                <span className="text-sm font-medium text-gray-700">Crear checklist retroactivo (fecha personalizada)</span>
              </label>
              {isRetroactive && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📅 Fecha del Checklist</label>
                    <input type="datetime-local" value={checklistDate} onChange={e => setChecklistDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  {selectedChecklistType?.frequency === 'semanal' || selectedChecklistType?.frequency === 'weekly' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">📆 Semana (YYYY-Wnn)</label>
                      <input type="text" value={weekIdentifier} onChange={e => setWeekIdentifier(e.target.value)}
                        placeholder="Ej: 2026-W19"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                  ) : null}
                  <div className="md:col-span-2 text-xs text-orange-800 bg-orange-100 border-l-4 border-orange-500 p-2 rounded">
                    ⚠️ Este checklist se creará con una fecha pasada. Asegúrate de que el usuario autorizó esta acción.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex gap-3 justify-center flex-wrap">
              {selectedUser && (
                <button onClick={handleCreateNewChecklist}
                  disabled={loading || (inspectables.length > 0 && !selectedInspectable)}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 text-sm">
                  <i className="fa fa-plus-circle"></i> Crear Nuevo Checklist
                </button>
              )}
              <button onClick={loadExistingChecklists} disabled={loading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 text-sm">
                <i className="fa fa-list"></i> Ver Checklists Existentes
              </button>
            </div>
            {!selectedUser && <p className="text-center text-xs text-gray-500 mt-2">Selecciona un usuario para crear un nuevo checklist</p>}
          </div>

          {/* Lista de checklists existentes con filtros */}
          {showExistingChecklists && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">
                  Checklists Existentes
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {filteredExistingChecklists.length} de {existingChecklists.length}
                  </span>
                </h3>
                <button onClick={loadExistingChecklists} disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <i className="fa fa-sync"></i> Actualizar
                </button>
              </div>

              {/* Filtros de la lista */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {/* Búsqueda */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">🔍 Buscar</label>
                  <input type="text" placeholder="ID, usuario, semana, notas..." value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                {/* Estado */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📋 Estado</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Todos</option>
                    <option value="complete">✓ Completos</option>
                    <option value="incomplete">⏳ Incompletos</option>
                  </select>
                </div>
                {/* Solo soporte */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-1">
                    <input type="checkbox" checked={filterOnlySupport} onChange={e => setFilterOnlySupport(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded" />
                    <span className="text-sm text-gray-700">🛡️ Solo de Soporte</span>
                  </label>
                </div>
                {/* Rango de fechas */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📅 Desde</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📅 Hasta</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setFilterSearch(''); setFilterStatus(''); setFilterOnlySupport(false); setFilterDateFrom(''); setFilterDateTo(''); }}
                    className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 pb-1">
                    <i className="fa fa-times"></i> Limpiar filtros
                  </button>
                </div>
              </div>

              {filteredExistingChecklists.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">No se encontraron checklists con los filtros aplicados</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredExistingChecklists.map(checklist => (
                    <div key={checklist.checklist_id}
                      className={`border rounded-lg p-3 hover:shadow-md transition-all ${checklist.created_by_support ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-purple-300'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 text-sm">#{checklist.checklist_id}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(checklist.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {checklist.week_identifier && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">📅 {checklist.week_identifier}</span>
                            )}
                            {checklist.created_by_support && (
                              <span className="text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded font-semibold">🛡️ Soporte</span>
                            )}
                            {checklist.is_complete
                              ? <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">✓ Completo</span>
                              : <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">⏳ Incompleto</span>
                            }
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Creado por: <strong>{checklist.creator?.user_name}</strong>
                            {checklist.creator?.role?.role_name && <span className="text-gray-400 ml-1">({checklist.creator.role.role_name})</span>}
                          </p>
                          {checklist.created_by_support && checklist.support_notes && (
                            <p className="text-xs text-orange-700 mt-0.5 italic truncate">{checklist.support_notes}</p>
                          )}
                          <div className="mt-1 flex gap-2">
                            <span className="text-xs text-gray-500">{checklist.response_count} resp.</span>
                            <span className="text-xs text-gray-500">{checklist.signature_count} firmas</span>
                          </div>
                        </div>
                        <button onClick={() => handleAccessExistingChecklist(checklist)} disabled={loading}
                          className="flex-shrink-0 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-400">
                          <i className="fa fa-sign-in-alt mr-1"></i> Acceder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-3 text-gray-700 text-sm">Cargando...</p>
          </div>
        </div>
      )}

      <SupportAuthorizationModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingAction(null); setPendingChecklist(null); }}
        onAuthorize={handleAuthorizationGranted}
        impersonatedUser={pendingChecklist?._impersonate_user || selectedUser || {}}
        checklistType={selectedChecklistType}
      />
    </div>
  );
}

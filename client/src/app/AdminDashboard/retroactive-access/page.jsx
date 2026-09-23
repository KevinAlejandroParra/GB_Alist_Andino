'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';
import axiosInstance from '../../../utils/axiosConfig';
import RetroactiveAccessRequestForm from '../../../components/admin/RetroactiveAccessRequest';

/**
 * Página dual de acceso retroactivo para administradores.
 *
 * Sin token en URL  → muestra formulario de solicitud + historial
 * Con token en URL  → valida el JWT retroactivo y ejecuta la acción aprobada
 */
export default function RetroactiveAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState('loading'); // 'loading' | 'form' | 'executing'
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSection, setActiveSection] = useState('form'); // 'form' | 'history'

  // Contexto del token retroactivo
  const [retroContext, setRetroContext] = useState(null);

  useEffect(() => {
    // El token puede venir como searchParam directo O almacenado en sessionStorage
    // por el AdminDashboard cuando el admin llega desde el correo
    const tokenFromUrl = searchParams.get('token');
    const tokenFromSession = sessionStorage.getItem('retroactive_access_token');
    const token = tokenFromUrl || tokenFromSession;

    if (token) {
      // Limpiar el token de sessionStorage para que no se reutilice en recargas
      sessionStorage.removeItem('retroactive_access_token');
      handleRetroToken(token);
    } else {
      setMode('form');
      loadHistory();
    }
  }, []);

  // ── Flujo con token ────────────────────────────────────────────────────────

  const handleRetroToken = async (token) => {
    setMode('executing');
    try {
      const res = await axiosInstance.post('/api/retroactive-access/validate-token', {
        retroactive_token: token,
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Token inválido');
      }

      const ctx = res.data.context;
      setRetroContext(ctx);

      // Ejecutar la acción según action_type
      if (ctx.action_type === 'access_existing') {
        await executeAccessExisting(ctx, token);
      } else {
        await executeCreateNew(ctx, token);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Token inválido o expirado';
      await Swal.fire({
        title: 'Acceso no válido',
        html: `<p>${msg}</p><p class="text-sm text-gray-500 mt-2">Si el enlace expiró, puedes crear una nueva solicitud.</p>`,
        icon: 'error',
        confirmButtonText: 'Ir al formulario',
        confirmButtonColor: '#7c3aed',
      });
      router.replace('/AdminDashboard?tab=retroactive-access');
    }
  };

  const navigateToChecklist = useCallback((checklistData) => {
    sessionStorage.setItem('support_context', JSON.stringify(checklistData.support_context));
    const typeCategory = checklistData.type?.type_category;
    const typeId = checklistData.type?.checklist_type_id || checklistData.checklist_type_id;
    const id = checklistData.checklist_id;
    const routes = {
      attraction: `/checklists/attraction/${typeId}?checklist_id=${id}`,
      family:     `/checklists/family/${typeId}?checklist_id=${id}`,
      premios:    `/checklists/premios/${typeId}?checklist_id=${id}`,
      static:     `/checklists/locativo/${typeId}?checklist_id=${id}`,
    };
    router.push(routes[typeCategory] || `/checklists/detail/${typeId}?checklist_id=${id}`);
  }, [router]);

  const markTokenUsed = async (request_id, checklist_id) => {
    try {
      await axiosInstance.post('/api/retroactive-access/mark-used', { request_id, checklist_id });
    } catch (err) {
      console.error('[RetroactiveAccess] Error marcando token como usado:', err.message);
    }
  };

  const executeAccessExisting = async (ctx, _token) => {
    const res = await axiosInstance.post(
      `/api/support/checklists/${ctx.target_checklist_id}/access`,
      { impersonate_user_id: ctx.admin_user_id }
    );

    if (res.data.success) {
      await markTokenUsed(ctx.request_id, ctx.target_checklist_id);
      await Swal.fire({
        title: '✅ Acceso retroactivo',
        html: `<p>Accediendo al checklist retroactivo del <strong>${ctx.target_date}</strong></p>`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
      navigateToChecklist(res.data.data);
    }
  };

  const executeCreateNew = async (ctx, _token) => {
    const authData = {
      fullName: 'Acceso Retroactivo Autorizado',
      document: `request_id:${ctx.request_id}`,
      timestamp: new Date().toISOString(),
    };

    const res = await axiosInstance.post(
      `/api/support/checklists/type/${ctx.checklist_type_id}/create`,
      {
        impersonate_user_id: ctx.admin_user_id,
        checklist_date: `${ctx.target_date}T12:00:00`,
        authorization_data: authData,
      }
    );

    if (res.data.success) {
      await markTokenUsed(ctx.request_id, res.data.data.checklist_id);
      await Swal.fire({
        title: '✅ Checklist retroactivo creado',
        html: `<p>Checklist creado para el <strong>${ctx.target_date}</strong></p>`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
      navigateToChecklist(res.data.data);
    }
  };

  // ── Historial ──────────────────────────────────────────────────────────────

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axiosInstance.get('/api/retroactive-access/requests');
      setRequests(res.data.data || []);
    } catch {
      // No bloquear la UI si falla
    } finally {
      setLoadingHistory(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      pending:  { bg: 'bg-yellow-100 text-yellow-800', label: '⏳ Pendiente' },
      approved: { bg: 'bg-green-100 text-green-800',   label: '✅ Aprobada' },
      rejected: { bg: 'bg-red-100 text-red-800',       label: '❌ Rechazada' },
    };
    const s = map[status] || { bg: 'bg-gray-100 text-gray-600', label: status };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.bg}`}>{s.label}</span>;
  };

  const actionBadge = (action_type) => (
    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
      {action_type === 'access_existing' ? '📂 Retomar existente' : '➕ Crear nuevo'}
    </span>
  );

  // ── Pantalla de ejecución ──────────────────────────────────────────────────

  if (mode === 'loading' || mode === 'executing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
        <svg className="animate-spin h-10 w-10 text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p className="text-gray-600 font-medium">
          {mode === 'executing' ? 'Validando acceso retroactivo...' : 'Cargando...'}
        </p>
      </div>
    );
  }

  // ── Modo formulario (modo normal) ─────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          ⏪ Acceso Retroactivo
        </h2>
        <p className="mt-1 text-purple-100 text-sm">
          Solicita permiso para completar un checklist de una fecha pasada. El técnico de sistemas revisará tu solicitud.
        </p>
      </div>

      {/* Tabs internos */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSection('form')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-all
            ${activeSection === 'form' ? 'bg-white shadow text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
        >
          📨 Nueva solicitud
        </button>
        <button
          onClick={() => { setActiveSection('history'); loadHistory(); }}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-all
            ${activeSection === 'history' ? 'bg-white shadow text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
        >
          📋 Mis solicitudes {requests.length > 0 && `(${requests.length})`}
        </button>
      </div>

      {/* Formulario */}
      {activeSection === 'form' && (
        <RetroactiveAccessRequestForm onRequestSent={() => { loadHistory(); setActiveSection('history'); }} />
      )}

      {/* Historial */}
      {activeSection === 'history' && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">Mis solicitudes</h3>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <svg className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                <path d="M4 4v5h.582M4.582 9A8 8 0 1112 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Actualizar
            </button>
          </div>

          {loadingHistory ? (
            <p className="text-center text-sm text-gray-500 py-6">Cargando...</p>
          ) : requests.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-6">No tienes solicitudes registradas aún.</p>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.request_id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-800 text-sm">#{r.request_id}</span>
                        {statusBadge(r.status)}
                        {actionBadge(r.action_type)}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{r.checklistType?.name}</span>
                        {' — '}
                        {new Date(`${r.target_date}T12:00:00`).toLocaleDateString('es-CO', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </p>
                      {r.target_checklist_id && (
                        <p className="text-xs text-gray-500 mt-0.5">Checklist destino: #{r.target_checklist_id}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Solicitado: {new Date(r.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        {r.approved_at && ` • Aprobado: ${new Date(r.approved_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`}
                        {r.rejected_at && ` • Rechazado: ${new Date(r.rejected_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`}
                        {r.used_at && ` • Usado: ${new Date(r.used_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`}
                      </p>
                    </div>
                    {r.checklist_id && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Checklist #{r.checklist_id}
                      </span>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                      ⏳ Pendiente de revisión por el técnico de sistemas.
                    </p>
                  )}
                  {r.status === 'approved' && !r.used_at && (
                    <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      ✅ Aprobada. Revisa tu correo para el enlace de acceso (expira 24h desde la aprobación).
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

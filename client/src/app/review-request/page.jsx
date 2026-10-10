'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axiosInstance from '../../utils/axiosConfig';

/**
 * Página de revisión de solicitudes retroactivas.
 * Accesible sin login — el técnico llega aquí desde el correo.
 * Pide contraseña para confirmar identidad antes de aprobar/rechazar.
 */
export default function ReviewRequestPage() {
  const searchParams = useSearchParams();
  const token  = searchParams.get('token');
  const action = searchParams.get('action'); // 'approve' | 'reject'

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);  // { success, message, status }
  const [error, setError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validar parámetros al montar
  useEffect(() => {
    if (!token || !['approve', 'reject'].includes(action)) {
      setResult({
        success: false,
        message: 'El enlace no es válido o está incompleto.',
        status: 'invalid',
      });
    }
  }, [token, action]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña para continuar');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await axiosInstance.post('/api/retroactive-access/review-auth', {
        token,
        action,
        email,
        password,
      });
      setResult({ success: true, message: res.data.message, status: res.data.status });
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error || 'Error al procesar la solicitud';

      if (status === 401) {
        setError('Contraseña incorrecta. Intenta de nuevo.');
      } else if (status === 410) {
        setResult({ success: false, message: msg, status: 'already_processed' });
      } else if (status === 404) {
        setResult({ success: false, message: 'Token inválido o solicitud no encontrada.', status: 'invalid' });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const isApprove = action === 'approve';
  const actionLabel = isApprove ? 'Aprobar' : 'Rechazar';
  const actionColor = isApprove ? '#16a34a' : '#dc2626';
  const actionIcon  = isApprove ? '✅' : '❌';

  // ── Pantalla de resultado ─────────────────────────────────────────────────
  if (result) {
    const icon    = result.status === 'approved' ? '✅'
                  : result.status === 'rejected' ? '❌'
                  : result.status === 'already_processed' ? '🔒'
                  : '⚠️';
    const color   = result.status === 'approved' ? '#16a34a'
                  : result.status === 'rejected' ? '#dc2626'
                  : '#6b7280';
    const bgColor = result.status === 'approved' ? '#f0fdf4'
                  : result.status === 'rejected' ? '#fef2f2'
                  : '#f9fafb';

    return (
      <div style={{
        margin: 0, padding: 0, background: '#f4f6f8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'Arial, Helvetica, sans-serif'
      }}>
        <div style={{
          background: bgColor, borderRadius: 12,
          boxShadow: '0 2px 16px rgba(0,0,0,.1)',
          padding: '48px 40px', maxWidth: 480, width: '90%', textAlign: 'center',
          border: `1px solid ${color}33`
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
          <h1 style={{ color, fontSize: 22, margin: '0 0 12px' }}>
            {result.status === 'approved' ? 'Solicitud aprobada'
              : result.status === 'rejected' ? 'Solicitud rechazada'
              : result.status === 'already_processed' ? 'Ya procesada'
              : 'Enlace inválido'}
          </h1>
          <p style={{ color: '#4b5563', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            {result.message}
          </p>
          <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 16 }}>
            Puedes cerrar esta ventana.
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario de contraseña ──────────────────────────────────────────────
  return (
    <div style={{
      margin: 0, padding: 0, background: '#f4f6f8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,.1)',
        padding: '48px 40px', maxWidth: 440, width: '90%'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '50%',
            background: isApprove ? '#dcfce7' : '#fee2e2',
            fontSize: 32, marginBottom: 12
          }}>
            {actionIcon}
          </div>
          <h1 style={{ color: '#111827', fontSize: 20, margin: '0 0 8px', fontWeight: 700 }}>
            {actionLabel} solicitud retroactiva
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            Confirma tu identidad ingresando tu contraseña del sistema.
          </p>
        </div>

        {/* Advertencia de acción */}
        <div style={{
          background: isApprove ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isApprove ? '#86efac' : '#fca5a5'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 24,
          fontSize: 13, color: isApprove ? '#166534' : '#991b1b'
        }}>
          {isApprove
            ? '⚠️ Al aprobar, el administrador recibirá un enlace de acceso por correo para completar el checklist retroactivo.'
            : '⚠️ Al rechazar, se notificará al administrador que su solicitud fue denegada.'}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 14, fontWeight: 600,
              color: '#374151', marginBottom: 6
            }}>
              ✉️ Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="tu@correo.com"
              autoFocus
              style={{
                width: '100%', padding: '10px 12px',
                border: `1px solid ${error && !email ? '#ef4444' : '#d1d5db'}`,
                borderRadius: 8, fontSize: 14, outline: 'none',
                boxSizing: 'border-box',
                background: error && !email ? '#fef2f2' : '#fff'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 14, fontWeight: 600,
              color: '#374151', marginBottom: 6
            }}>
              🔒 Contraseña de sistema
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Ingresa tu contraseña"
                style={{
                  width: '100%', padding: '10px 40px 10px 12px',
                  border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: 8, fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                  background: error ? '#fef2f2' : '#fff'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: '#9ca3af'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, margin: '6px 0 0' }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim() || !email.trim()}
            style={{
              width: '100%', padding: '12px 0',
              background: loading || !password.trim() || !email.trim() ? '#d1d5db' : actionColor,
              color: '#ffffff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 700, cursor: loading || !password.trim() || !email.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading
              ? 'Procesando...'
              : `${actionIcon} ${actionLabel} solicitud`}
          </button>
        </form>

        <p style={{
          textAlign: 'center', fontSize: 12,
          color: '#9ca3af', marginTop: 20
        }}>
          Esta acción quedará registrada con tu IP y la hora actual.
        </p>
      </div>
    </div>
  );
}

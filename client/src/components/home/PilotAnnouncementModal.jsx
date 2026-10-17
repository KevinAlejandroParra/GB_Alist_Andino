'use client';

import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';

const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';
const DISMISS_KEY = 'pilot_announcement_dismissed';
const ANNOUNCEMENT_ID = 'v1'; // Cambiar este ID para volver a mostrar el anuncio a todos

/**
 * Anuncio modal flotante de salida de la etapa piloto + Buzón de
 * peticiones, quejas y reclamos (PQR). Aparece al iniciar sesión
 * (en el Dashboard) y puede cerrarse con el botón o la tecla ESC.
 */
export default function PilotAnnouncementModal() {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // No reabrir si el usuario ya lo cerró con esta versión del anuncio
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === ANNOUNCEMENT_ID) {
      return;
    }
    const timer = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar con tecla ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, ANNOUNCEMENT_ID);
    } catch {
      /* almacenamiento no disponible */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !message.trim()) {
      setError('Completa tu nombre y tu mensaje.');
      return;
    }

    setSending(true);
    try {
      await axiosInstance.post(`${API_URL}/api/feedback`, {
        name: name.trim(),
        message: message.trim()
      });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={handleClose} aria-label="Cerrar anuncio" />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
        >
          <i className="fas fa-times text-lg" />
        </button>

        {/* Encabezado del anuncio */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-7 pr-14 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <h2 className="text-xl font-bold">¡Holaa!</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-indigo-50">
            Alist se está preparando por fin para salir oficialmente de la etapa piloto. Agradecemos
            muchísimo la paciencia que han tenido para hacer checklists físicos y digitales —{' '}
            <strong className="text-white">nos queda un último esfuerzo</strong>.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-indigo-50">
            Se vendrán algunos cambios; por eso implementamos un{' '}
            <strong className="text-white">buzón de peticiones, quejas o reclamos</strong>. Si tienes
            alguna sugerencia o observación, será muy bienvenida.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {!sent && (
            <p className="text-xs text-gray-500 mb-4">
              📬 ¿Tienes alguna petición, queja o reclamo? Déjanosla aquí — la leeremos personalmente.
            </p>
          )}

          {sent ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold">¡Mensaje enviado!</p>
                <p className="text-xs text-emerald-700">Gracias por tu opinión — la tendremos en cuenta para los próximos cambios.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="feedback-name" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Nombre
                </label>
                <input
                  id="feedback-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="feedback-message" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Mensaje
                </label>
                <textarea
                  id="feedback-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={5000}
                  placeholder="Escribe tu petición, queja, reclamo o sugerencia..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
                >
                  {sending && <i className="fas fa-spinner fa-spin" />}
                  {sending ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-5 text-xs text-gray-400 text-right">
            Atentamente, <span className="font-semibold text-gray-500">Alejandro Parra — Asistente de Tecnología</span>
          </p>
        </div>
      </div>
    </div>
  );
}

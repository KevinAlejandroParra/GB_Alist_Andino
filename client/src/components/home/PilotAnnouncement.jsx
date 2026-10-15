'use client';

import { useState } from 'react';
import axiosInstance from '../../utils/axiosConfig';

const API_URL = process.env.NEXT_PUBLIC_API || 'http://localhost:5000';

/**
 * Anuncio de salida de la etapa piloto + Buzón de peticiones,
 * quejas y reclamos (PQR). Se muestra en el inicio de la app.
 */
export default function PilotAnnouncement() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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
      setName('');
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6">
      <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
        {/* Encabezado del anuncio */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <h2 className="text-xl font-bold">¡Hola Alist!</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-indigo-50">
            Se está preparando por fin para salir oficialmente de la etapa piloto. Agradecemos
            muchísimo la paciencia que han tenido para hacer checklists físicos y digitales —{' '}
            <strong className="text-white">nos queda un último esfuerzo</strong>.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-indigo-50">
            Se vendrán algunos cambios; por eso implementamos un{' '}
            <strong className="text-white">buzón de peticiones, quejas o reclamos</strong>. Si tienes
            alguna sugerencia, será muy bienvenida.
          </p>
        </div>

        {/* Acciones */}
        <div className="p-5">
          {!showForm && !sent && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              📬 Abrir buzón de sugerencias
            </button>
          )}

          {sent && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold">¡Mensaje enviado!</p>
                <p className="text-xs text-emerald-700">Gracias por tu opinión — la tendremos en cuenta para los próximos cambios.</p>
              </div>
            </div>
          )}

          {showForm && !sent && (
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
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  disabled={sending}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-xs text-gray-400 text-right">
            Atentamente, <span className="font-semibold text-gray-500">Alejandro Parra — Asistente de Tecnología</span>
          </p>
        </div>
      </div>
    </div>
  );
}

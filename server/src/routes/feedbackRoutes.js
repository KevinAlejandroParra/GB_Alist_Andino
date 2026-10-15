'use strict';

const express = require('express');
const router = express.Router();
const { createTransporter } = require('../config/emailConfig');

const FEEDBACK_RECIPIENT = process.env.FEEDBACK_EMAIL || 'sistemas2@recreatec.co';

// Simple rate limit en memoria: máx 5 envíos por IP cada 10 minutos
const submissionLog = new Map(); // ip -> [timestamps]
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entries = (submissionLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (entries.length >= RATE_LIMIT_MAX) {
    submissionLog.set(ip, entries);
    return true;
  }
  entries.push(now);
  submissionLog.set(ip, entries);
  return false;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// POST /api/feedback - Buzón de peticiones, quejas y reclamos
router.post('/', async (req, res) => {
  try {
    const { name, message } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'El nombre es obligatorio.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'El mensaje es obligatorio.' });
    }
    if (String(message).length > 5000) {
      return res.status(400).json({ success: false, error: 'El mensaje es demasiado largo (máx. 5000 caracteres).' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'desconocida';
    if (isRateLimited(ip)) {
      return res.status(429).json({ success: false, error: 'Demasiados envíos. Intenta de nuevo en unos minutos.' });
    }

    const transporter = createTransporter();
    if (!transporter) {
      console.error('[Feedback] EMAIL_USER/APP_PASSWORD no configurados; no se puede enviar el correo.');
      return res.status(500).json({ success: false, error: 'El buzón no está disponible en este momento.' });
    }

    const safeName = escapeHtml(String(name).trim());
    const safeMessage = escapeHtml(String(message).trim()).replace(/\n/g, '<br/>');

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: FEEDBACK_RECIPIENT,
      subject: `📧 Buzón Alist — ${safeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); color: #fff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 18px;">📬 Nuevo mensaje del buzón de Alist</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">Peticiones, quejas o reclamos — etapa pre-salida del piloto</p>
          </div>
          <div style="padding: 24px; color: #1f2937;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Nombre</p>
            <p style="margin: 0 0 16px; font-size: 15px; font-weight: bold;">${safeName}</p>
            <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Mensaje</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
          </div>
          <div style="padding: 12px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">Enviado desde el inicio de Alist • IP: ${escapeHtml(ip)} • ${new Date().toLocaleString('es-CO')}</p>
          </div>
        </div>
      `,
      text: `Nuevo mensaje del buzón de Alist\n\nNombre: ${String(name).trim()}\n\nMensaje:\n${String(message).trim()}\n\nIP: ${ip} - ${new Date().toLocaleString('es-CO')}`
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Feedback] Error enviando correo:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.' });
  }
});

module.exports = router;

const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración del transportador para Microsoft/Outlook
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.APP_PASSWORD) {
    console.error('CREDENCIALES DE EMAIL FALTANTES');
    throw new Error('Configuración de email incompleta');
  }
  return nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false, 
    requireTLS: true, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.APP_PASSWORD
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false 
    }
  });
};

module.exports = {
  createTransporter
};
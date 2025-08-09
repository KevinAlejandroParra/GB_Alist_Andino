"use client"; 

import Link from 'next/link';
import { AuthProvider } from '../components/AuthContext';
import "./globals.css";

export default function Home() {
  return (
    <AuthProvider>
      <div className="container">
        <h1>Bienvenido a ALIST</h1>
        <div className="auth-links">
          <Link href="/login" className="auth-link">Iniciar Sesión</Link>
          <Link href="/register" className="auth-link">Registrarse</Link>
        </div>
      </div>
    </AuthProvider>
  );
}
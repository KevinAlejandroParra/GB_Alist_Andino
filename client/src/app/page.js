import Link from 'next/link';
import "./globals.css"

export default function Home() {
  return (
    <div>
      <h1>Bienvenido a ALIST</h1>
      <Link href="/login">Iniciar Sesión</Link>
      <Link href="/register">Registrarse</Link>
      <Link href="/Admins">Dashboard</Link>
    </div>
  );
}
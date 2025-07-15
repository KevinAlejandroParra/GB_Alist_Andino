import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>Bienvenido a ALIST</h1>
      <Link href="/login">Iniciar Sesión</Link>
      <Link href="/register">Registrarse</Link>
    </div>
  );
}
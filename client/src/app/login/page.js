"use client";
import { useState } from 'react';



export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_email: email, user_password: password }),
    });
          console.log(response);

    if (!response.ok) {
      const data = await response.json();
      setError(data.message);
      return;
    }

    const data = await response.json(); 
    localStorage.setItem('token', data.token); 
    alert('Inicio de sesión exitoso');
  };
    console.log("la direccion de la peticion es: ", `${process.env.NEXT_PUBLIC_API}`);

  return (
    <div>
      <h1>Inicializa Sesión</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Correo:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Contraseña:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Inicia Sesión</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}
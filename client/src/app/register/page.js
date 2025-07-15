"use client";
import { useState } from 'react';

export default function Register() {
  const [document, setDocument] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API}users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_document_type: documentType,
        user_document: document,
        user_name: name,
        user_lastname: lastname,
        user_email: email,
        user_image: image,
        user_role: role,
        user_password: password,
        user_phone: phone,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message);
      return;
    }

    alert('Registro exitoso');
  };

  return (
    <div>
      <h1>Registro</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Apellido:</label>
          <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} required />
        </div>
        <div>
          <label>Tipo de documento:</label>
          <input type="text" value={documentType} onChange={(e) => setDocumentType(e.target.value)} required />
        </div>
        <div>
          <label>Documento:</label>
          <input type="text" value={document} onChange={(e) => setDocument(e.target.value)} required />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Contraseña:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Imagen:</label>
          <input type="file" value={image} onChange={(e) => setImage(e.target.value)} required />
        </div>
        <div>
          <label>Rol:</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)} required />
        </div>
        <div>
          <label>Teléfono:</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <button type="submit">Registrar</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

"use client";
import { useEffect, useState } from 'react';

export default function Admins() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API}users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message);
        return;
      }

      const data = await response.json();
      setUsers(data.data);
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Usuarios Registrados</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Email</th>
            <th>Teléfono</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.user_id}>
              <td>{user.user_id}</td>
              <td>{user.user_name}</td>
              <td>{user.user_lastname}</td>
              <td>{user.user_email}</td>
              <td>{user.user_phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

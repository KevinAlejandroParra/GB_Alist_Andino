'use client';
import { useState, useEffect } from 'react';

export default function RoleManagement() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRole, setCurrentRole] = useState(null);
    const [form, setForm] = useState({
        role_name: '',
        role_description: '',
    });

    const URL_API = `${process.env.NEXT_PUBLIC_API}/`; 

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}api/roles`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Error al obtener los roles');
            }
            const data = await response.json();
            setRoles(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const method = currentRole ? 'PUT' : 'POST';
            const url = currentRole
                ? `${URL_API}api/roles/${currentRole.role_id}`
                : `${URL_API}api/roles`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                throw new Error('Error al guardar el rol');
            }

            setIsModalOpen(false);
            setForm({
                role_name: '',
                role_description: '',
            });
            setCurrentRole(null);
            fetchRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (role) => {
        setCurrentRole(role);
        setForm({
            role_name: role.role_name,
            role_description: role.role_description,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este rol?')) {
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}api/roles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Error al eliminar el rol');
            }
            fetchRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Cargando roles...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Gestión de Roles</h2>

            <button
                className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-green-600 transition-colors"
                onClick={() => {
                    setCurrentRole(null);
                    setForm({ role_name: '', role_description: '' });
                    setIsModalOpen(true);
                }}
            >
                Agregar Rol
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-1/2">
                        <h3 className="text-xl font-bold mb-4">{currentRole ? 'Editar Rol' : 'Agregar Rol'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="role_name" className="block text-gray-700 text-sm font-bold mb-2">Nombre del Rol:</label>
                                <input
                                    type="text"
                                    id="role_name"
                                    name="role_name"
                                    value={form.role_name}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="role_description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                                <input
                                    type="text"
                                    id="role_description"
                                    name="role_description"
                                    value={form.role_description}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2 hover:bg-gray-400 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    {currentRole ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="py-3 px-4 text-left">ID</th>
                            <th className="py-3 px-4 text-left">Nombre</th>
                            <th className="py-3 px-4 text-left">Descripción</th>
                            <th className="py-3 px-4 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => (
                            <tr key={role.role_id} className="border-b last:border-b-0 hover:bg-gray-100">
                                <td className="py-3 px-4">{role.role_id}</td>
                                <td className="py-3 px-4">{role.role_name}</td>
                                <td className="py-3 px-4">{role.role_description}</td>
                                <td className="py-3 px-4">
                                    <button
                                        className="bg-yellow-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-yellow-600 transition-colors"
                                        onClick={() => handleEdit(role)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                                        onClick={() => handleDelete(role.role_id)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

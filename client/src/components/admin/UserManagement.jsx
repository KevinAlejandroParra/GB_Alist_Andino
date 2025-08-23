'use client';
import { useState, useEffect } from 'react';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [premises, setPremises] = useState([]);
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [form, setForm] = useState({
        role_id: '',
        premise_id: '',
        entity_id: '',
    });

    const URL_API = `${process.env.NEXT_PUBLIC_API}`; 

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            const [usersRes, rolesRes, premisesRes, entitiesRes] = await Promise.all([
                fetch(`${URL_API}/api/users`, { headers }),
                fetch(`${URL_API}/api/roles`, { headers }),
                fetch(`${URL_API}/api/premises`, { headers }),
                fetch(`${URL_API}/api/entities`, { headers }),
            ]);

            const usersData = await usersRes.json();
            const rolesData = await rolesRes.json();
            const premisesData = await premisesRes.json();
            const entitiesData = await entitiesRes.json();

            if (!usersRes.ok || !rolesRes.ok || !premisesRes.ok || !entitiesRes.ok) {
                throw new Error('Error al obtener datos');
            }

            setUsers(usersData.data);
            setRoles(rolesData.data);
            setPremises(premisesData.data);
            setEntities(entitiesData.data);

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

    const handleEdit = (user) => {
        setCurrentUser(user);
        setForm({
            role_id: user.role_id || '',
            premise_id: user.premise_id || '',
            entity_id: user.entity_id || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}/api/users/${currentUser.user_id}/admin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el usuario');
            }

            setIsModalOpen(false);
            setForm({
                role_id: '',
                premise_id: '',
                entity_id: '',
            });
            setCurrentUser(null);
            fetchData(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleState = async (user_id, currentState) => {
        if (!confirm(`¿Estás seguro de que quieres cambiar el estado de este usuario a ${currentState === 'activo' ? 'inactivo' : 'activo'}?`)) {
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}/api/users/${user_id}/state`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Error al cambiar el estado del usuario');
            }
            fetchData(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Cargando datos...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Gestión de Usuarios</h2>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-1/2">
                        <h3 className="text-xl font-bold mb-4">Editar Usuario: {currentUser?.user_name}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="role_id" className="block text-gray-700 text-sm font-bold mb-2">Rol:</label>
                                <select
                                    id="role_id"
                                    name="role_id"
                                    value={form.role_id}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="">Selecciona un rol</option>
                                    {roles.map(role => (
                                        <option key={role.role_id} value={role.role_id}>
                                            {role.role_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="premise_id" className="block text-gray-700 text-sm font-bold mb-2">Sede:</label>
                                <select
                                    id="premise_id"
                                    name="premise_id"
                                    value={form.premise_id}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="">Selecciona una sede</option>
                                    {premises.map(premise => (
                                        <option key={premise.premise_id} value={premise.premise_id}>
                                            {premise.premise_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="entity_id" className="block text-gray-700 text-sm font-bold mb-2">Entidad:</label>
                                <select
                                    id="entity_id"
                                    name="entity_id"
                                    value={form.entity_id}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="">Selecciona una entidad</option>
                                    {entities.map(entity => (
                                        <option key={entity.entity_id} value={entity.entity_id}>
                                            {entity.entity_name}
                                        </option>
                                    ))}
                                </select>
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
                                    Actualizar
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
                            <th className="py-3 px-4 text-left">Email</th>
                            <th className="py-3 px-4 text-left">Rol</th>
                            <th className="py-3 px-4 text-left">Sede</th>
                            <th className="py-3 px-4 text-left">Entidad</th>
                            <th className="py-3 px-4 text-left">Estado</th>
                            <th className="py-3 px-4 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.user_id} className="border-b last:border-b-0 hover:bg-gray-100">
                                <td className="py-3 px-4">{user.user_id}</td>
                                <td className="py-3 px-4">{user.user_name}</td>
                                <td className="py-3 px-4">{user.user_email}</td>
                                <td className="py-3 px-4">{user.role?.role_name || 'N/A'}</td>
                                <td className="py-3 px-4">{user.premise?.premise_name || 'N/A'}</td>
                                <td className="py-3 px-4">{user.entity?.entity_name || 'N/A'}</td>
                                <td className="py-3 px-4">{user.user_state}</td>
                                <td className="py-3 px-4">
                                    <button
                                        className="bg-yellow-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-yellow-600 transition-colors"
                                        onClick={() => handleEdit(user)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className={`${
                                            user.user_state === 'activo' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                        } text-white px-3 py-1 rounded-md transition-colors`}
                                        onClick={() => handleToggleState(user.user_id, user.user_state)}
                                    >
                                        {user.user_state === 'activo' ? 'Desactivar' : 'Activar'}
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

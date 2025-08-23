'use client';
import { useState, useEffect } from 'react';

export default function EntityManagement() {
    const [entities, setEntities] = useState([]);
    const [premises, setPremises] = useState([]); // Nuevo estado para almacenar las sedes
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntity, setCurrentEntity] = useState(null);
    const [form, setForm] = useState({
        entity_name: '',
        entity_description: '',
        premise_id: '', // Añadir premise_id al formulario
    });

    const URL_API = `${process.env.NEXT_PUBLIC_API}`; 

    useEffect(() => {
        fetchEntitiesAndPremises(); // Cambiar a una función que traiga ambos
    }, []);

    const fetchEntitiesAndPremises = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            const [entitiesRes, premisesRes] = await Promise.all([
                fetch(`${URL_API}/api/entities`, { headers }),
                fetch(`${URL_API}/api/premises`, { headers }),
            ]);

            const entitiesData = await entitiesRes.json();
            const premisesData = await premisesRes.json();

            if (!entitiesRes.ok || !premisesRes.ok) {
                throw new Error('Error al obtener datos');
            }

            setEntities(entitiesData.data);
            setPremises(premisesData.data);

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
            const method = currentEntity ? 'PUT' : 'POST';
            const url = currentEntity
                ? `${URL_API}/api/entities/${currentEntity.entity_id}`
                : `${URL_API}/api/entities`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                throw new Error('Error al guardar la entidad');
            }

            setIsModalOpen(false);
            setForm({
                entity_name: '',
                entity_description: '',
                premise_id: '',
            });
            setCurrentEntity(null);
            fetchEntitiesAndPremises();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (entity) => {
        setCurrentEntity(entity);
        setForm({
            entity_name: entity.entity_name,
            entity_description: entity.entity_description,
            premise_id: entity.premise_id || '', // Asignar premise_id al formulario
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta entidad?')) {
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}/api/entities/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la entidad');
            }
            fetchEntitiesAndPremises();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Cargando entidades...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Gestión de Entidades</h2>

            <button
                className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-green-600 transition-colors"
                onClick={() => {
                    setCurrentEntity(null);
                    setForm({ entity_name: '', entity_description: '', premise_id: '' });
                    setIsModalOpen(true);
                }}
            >
                Agregar Entidad
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-1/2">
                        <h3 className="text-xl font-bold mb-4">{currentEntity ? 'Editar Entidad' : 'Agregar Entidad'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="entity_name" className="block text-gray-700 text-sm font-bold mb-2">Nombre de la Entidad:</label>
                                <input
                                    type="text"
                                    id="entity_name"
                                    name="entity_name"
                                    value={form.entity_name}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="entity_description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                                <input
                                    type="text"
                                    id="entity_description"
                                    name="entity_description"
                                    value={form.entity_description}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="premise_id" className="block text-gray-700 text-sm font-bold mb-2">Sede:</label>
                                <select
                                    id="premise_id"
                                    name="premise_id"
                                    value={form.premise_id}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                >
                                    <option value="">Selecciona una sede</option>
                                    {premises.map(premise => (
                                        <option key={premise.premise_id} value={premise.premise_id}>
                                            {premise.premise_name}
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
                                    {currentEntity ? 'Actualizar' : 'Guardar'}
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
                        <th className="py-3 px-4 text-left">ID</th><th className="py-3 px-4 text-left">Nombre</th><th className="py-3 px-4 text-left">Descripción</th><th className="py-3 px-4 text-left">Sede</th><th className="py-3 px-4 text-left">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                        {entities.map((entity) => (
                            <tr key={entity.entity_id} className="border-b last:border-b-0 hover:bg-gray-100">
                                <td className="py-3 px-4">{entity.entity_id}</td>
                                <td className="py-3 px-4">{entity.entity_name}</td>
                                <td className="py-3 px-4">{entity.entity_description}</td>
                                <td className="py-3 px-4">{entity.premise?.premise_name || 'N/A'}</td>
                                <td className="py-3 px-4">
                                    <button
                                        className="bg-yellow-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-yellow-600 transition-colors"
                                        onClick={() => handleEdit(entity)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                                        onClick={() => handleDelete(entity.entity_id)}
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

'use client';
import { useState, useEffect } from 'react';

export default function PremiseManagement() {
    const [premises, setPremises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPremise, setCurrentPremise] = useState(null);
    const [form, setForm] = useState({
        premise_name: '',
        premise_address: '',
    });

    const URL_API = `${process.env.NEXT_PUBLIC_API}`; 

    useEffect(() => {
        fetchPremises();
    }, []);

    const fetchPremises = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}/api/premises`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error('Error al obtener las sedes');
            }
            const data = await response.json();
            setPremises(data.data);
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
            const method = currentPremise ? 'PUT' : 'POST';
            const url = currentPremise
                ? `${URL_API}/api/premises/${currentPremise.premise_id}`
                : `${URL_API}/api/premises`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (!response.ok) {
                throw new Error('Error al guardar la sede');
            }

            setIsModalOpen(false);
            setForm({
                premise_name: '',
                premise_address: '',
            });
            setCurrentPremise(null);
            fetchPremises();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (premise) => {
        setCurrentPremise(premise);
        setForm({
            premise_name: premise.premise_name,
            premise_address: premise.premise_address,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta sede?')) {
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${URL_API}/api/premises/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la sede');
            }
            fetchPremises();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <p>Cargando sedes...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-semibold mb-4">Gestión de Sedes</h2>

            <button
                className="bg-green-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-green-600 transition-colors"
                onClick={() => {
                    setCurrentPremise(null);
                    setForm({ premise_name: '', premise_address: '' });
                    setIsModalOpen(true);
                }}
            >
                Agregar Sede
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-1/2">
                        <h3 className="text-xl font-bold mb-4">{currentPremise ? 'Editar Sede' : 'Agregar Sede'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="premise_name" className="block text-gray-700 text-sm font-bold mb-2">Nombre de la Sede:</label>
                                <input
                                    type="text"
                                    id="premise_name"
                                    name="premise_name"
                                    value={form.premise_name}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="premise_address" className="block text-gray-700 text-sm font-bold mb-2">Dirección:</label>
                                <input
                                    type="text"
                                    id="premise_address"
                                    name="premise_address"
                                    value={form.premise_address}
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
                                    {currentPremise ? 'Actualizar' : 'Guardar'}
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
                            <th className="py-3 px-4 text-left">Dirección</th>
                            <th className="py-3 px-4 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {premises.map((premise) => (
                            <tr key={premise.premise_id} className="border-b last:border-b-0 hover:bg-gray-100">
                                <td className="py-3 px-4">{premise.premise_id}</td>
                                <td className="py-3 px-4">{premise.premise_name}</td>
                                <td className="py-3 px-4">{premise.premise_address}</td>
                                <td className="py-3 px-4">
                                    <button
                                        className="bg-yellow-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-yellow-600 transition-colors"
                                        onClick={() => handleEdit(premise)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                                        onClick={() => handleDelete(premise.premise_id)}
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

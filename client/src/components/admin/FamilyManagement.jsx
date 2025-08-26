import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

const FamilyManagement = () => {
    const [families, setFamilies] = useState([]);
    const [newFamily, setNewFamily] = useState({ family_name: '', family_description: '' });
    const [editingFamily, setEditingFamily] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFamilies();
    }, []);

    const fetchFamilies = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/families`);
            setFamilies(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching families:", err);
            setError("Error al cargar las familias.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFamily = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${API_BASE_URL}/api/families`, newFamily);
            setFamilies([...families, response.data]);
            setNewFamily({ family_name: '', family_description: '' });
            setError(null);
        } catch (err) {
            console.error("Error creating family:", err);
            setError("Error al crear la familia.");
        }
    };

    const handleEditClick = (family) => {
        setEditingFamily({ ...family });
    };

    const handleUpdateFamily = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.put(`${API_BASE_URL}/api/families/${editingFamily.family_id}`, editingFamily);
            setFamilies(families.map((fam) => (fam.family_id === editingFamily.family_id ? response.data.family : fam)));
            setEditingFamily(null);
            setError(null);
        } catch (err) {
            console.error("Error updating family:", err);
            setError("Error al actualizar la familia.");
        }
    };

    const handleDeleteFamily = async (id) => {
        try {
            await axios.put(`${API_BASE_URL}/api/families/${id}/soft`);
            setFamilies(families.filter((fam) => fam.family_id !== id));
            setError(null);
        } catch (err) {
            console.error("Error deleting family:", err);
            if (err.response && err.response.status === 400) {
                setError(err.response.data.message);
            } else {
                setError("Error al eliminar la familia.");
            }
        }
    };

    if (loading) return <p>Cargando familias...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Gestión de Familias</h2>

            <div className="mb-8 p-4 border rounded shadow">
                <h3 className="text-xl font-semibold mb-2">Crear Nueva Familia</h3>
                <form onSubmit={handleCreateFamily} className="space-y-4">
                    <div>
                        <label htmlFor="new_family_name" className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input
                            type="text"
                            id="new_family_name"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newFamily.family_name}
                            onChange={(e) => setNewFamily({ ...newFamily, family_name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new_family_description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input
                            type="text"
                            id="new_family_description"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newFamily.family_description}
                            onChange={(e) => setNewFamily({ ...newFamily, family_description: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                    >
                        Crear Familia
                    </button>
                </form>
            </div>

            <div className="mb-8 p-4 border rounded shadow">
                <h3 className="text-xl font-semibold mb-2">Lista de Familias</h3>
                <ul className="space-y-2">
                    {families.map((family) => (
                        <li key={family.family_id} className="flex justify-between items-center p-3 border rounded-md bg-gray-50">
                            <div>
                                <p className="font-semibold">{family.family_name}</p>
                                <p className="text-sm text-gray-600">{family.family_description}</p>
                            </div>
                            <div>
                                <button
                                    onClick={() => handleEditClick(family)}
                                    className="mr-2 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteFamily(family.family_id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {editingFamily && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
                        <h3 className="text-xl font-semibold mb-4">Editar Familia</h3>
                        <form onSubmit={handleUpdateFamily} className="space-y-4">
                            <div>
                                <label htmlFor="edit_family_name" className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    id="edit_family_name"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingFamily.family_name}
                                    onChange={(e) => setEditingFamily({ ...editingFamily, family_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_family_description" className="block text-sm font-medium text-gray-700">Descripción</label>
                                <input
                                    type="text"
                                    id="edit_family_description"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingFamily.family_description}
                                    onChange={(e) => setEditingFamily({ ...editingFamily, family_description: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingFamily(null)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                                >
                                    Actualizar Familia
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyManagement;

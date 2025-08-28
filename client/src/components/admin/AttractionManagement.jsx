import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

const AttractionManagement = () => {
    const [attractions, setAttractions] = useState([]);
    const [premises, setPremises] = useState([]);
    const [newAttraction, setNewAttraction] = useState({
        name: '',
        description: '',
        premise_id: '',
        public_flag: '',
        capacity: '',
    });
    const [newAttractionPhoto, setNewAttractionPhoto] = useState(null);
    const [editingAttraction, setEditingAttraction] = useState(null);
    const [editingAttractionPhoto, setEditingAttractionPhoto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [attractionsResponse, premisesResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/attractions`),
                axios.get(`${API_BASE_URL}/api/premises`),
            ]);
            setAttractions(attractionsResponse.data);
            setPremises(premisesResponse.data.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const getPremiseName = (premise_id) => {
        const premise = premises.find((prem) => prem.premise_id === premise_id);
        return premise ? premise.premise_name : 'Desconocida';
    };

    const handleCreateAttraction = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            for (const key in newAttraction) {
                formData.append(key, newAttraction[key]);
            }
            if (newAttractionPhoto) {
                formData.append('photo', newAttractionPhoto);
            }

            const response = await axios.post(`${API_BASE_URL}/api/attractions`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setAttractions([...attractions, response.data]);
            setNewAttraction({
                name: '',
                description: '',
                premise_id: '',
                public_flag: '',
                capacity: '',
            });
            setNewAttractionPhoto(null);
            setError(null);
            fetchData(); 
        } catch (err) {
            console.error("Error creating attraction:", err);
            setError("Error al crear la atracción.");
        }
    };

    const handleEditClick = (attraction) => {
        setEditingAttraction({
            ...attraction,
            name: attraction.inspectable?.name || '',
            description: attraction.inspectable?.description || '',
            premise_id: attraction.inspectable?.premise_id || '',
            photo_url: attraction.inspectable?.photo_url ? `${API_BASE_URL}${attraction.inspectable.photo_url}` : '', 
        });
        setEditingAttractionPhoto(null); 
    };

    const handleUpdateAttraction = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();

            for (const key in editingAttraction) {
                if (key === 'photo_url' && editingAttractionPhoto) {
                    continue; 
                }
                if (key !== 'inspectable' && key !== 'name' && key !== 'description' && key !== 'premise_id') {
                    formData.append(key, editingAttraction[key]);
                }
            }

            formData.append('name', editingAttraction.name);
            formData.append('description', editingAttraction.description);
            formData.append('premise_id', editingAttraction.premise_id);

            if (editingAttractionPhoto) {
                formData.append('photo', editingAttractionPhoto);
            }

            const response = await axios.put(`${API_BASE_URL}/api/attractions/${editingAttraction.ins_id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setAttractions(attractions.map((attr) => (attr.ins_id === editingAttraction.ins_id ? response.data.attraction : attr)));
            setEditingAttraction(null);
            setEditingAttractionPhoto(null);
            setError(null);
            fetchData();
        } catch (err) {
            console.error("Error updating attraction:", err);
            setError("Error al actualizar la atracción.");
        }
    };

    const handleDeleteAttraction = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/attractions/${id}`);
            setAttractions(attractions.filter((attr) => attr.ins_id !== id));
            setError(null);
        } catch (err) {
            console.error("Error deleting attraction:", err);
            if (err.response && err.response.status === 400) {
                setError(err.response.data.message);
            } else {
                setError("Error al eliminar la atracción.");
            }
        }
    };

    if (loading) return <p>Cargando atracciones...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Gestión de Atracciones</h2>

            <div className="mb-8 p-4 border rounded shadow">
                <h3 className="text-xl font-semibold mb-2">Crear Nueva Atracción</h3>
                <form onSubmit={handleCreateAttraction} className="space-y-4">
                    <div>
                        <label htmlFor="new_attraction_name" className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input
                            type="text"
                            id="new_attraction_name"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newAttraction.name}
                            onChange={(e) => setNewAttraction({ ...newAttraction, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new_attraction_description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input
                            type="text"
                            id="new_attraction_description"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newAttraction.description}
                            onChange={(e) => setNewAttraction({ ...newAttraction, description: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new_attraction_premise" className="block text-sm font-medium text-gray-700">Sede</label>
                        <select
                            id="new_attraction_premise"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newAttraction.premise_id}
                            onChange={(e) => setNewAttraction({ ...newAttraction, premise_id: e.target.value })}
                            required
                        >
                            <option value="">Selecciona una sede</option>
                            {premises.map((premise) => (
                                <option key={premise.premise_id} value={premise.premise_id}>
                                    {premise.premise_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="new_attraction_public_flag" className="block text-sm font-medium text-gray-700">Flag Público</label>
                        <select
                            id="new_attraction_public_flag"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newAttraction.public_flag}
                            onChange={(e) => setNewAttraction({ ...newAttraction, public_flag: e.target.value })}
                            required
                        >
                            <option value="">Disponible al publico?</option>
                            <option value="Sí">Sí</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="new_attraction_capacity" className="block text-sm font-medium text-gray-700">Capacidad</label>
                        <input
                            type="number"
                            id="new_attraction_capacity"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newAttraction.capacity}
                            onChange={(e) => setNewAttraction({ ...newAttraction, capacity: e.target.value })}
                            required
                        />
                    </div>
                    <div> 
                        <label htmlFor="new_attraction_photo" className="block text-sm font-medium text-gray-700">Subir Foto</label>
                        <input
                            type="file"
                            id="new_attraction_photo"
                            className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                            onChange={(e) => setNewAttractionPhoto(e.target.files[0])}
                            accept="image/*"
                        />
                        {newAttractionPhoto && (
                            <p className="text-sm text-gray-500 mt-1">Archivo seleccionado: {newAttractionPhoto.name}</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                    >
                        Crear Atracción
                    </button>
                </form>
            </div>

            <div className="mb-8 p-4 border rounded shadow">
                <h3 className="text-xl font-semibold mb-2">Lista de Atracciones</h3>
                <ul className="space-y-2">
                    {attractions.map((attraction) => (
                        <li key={attraction.ins_id} className="flex justify-between items-center p-3 border rounded-md bg-gray-50">
                            <div>
                                <p className="font-semibold">{attraction.inspectable?.name}</p>
                                <p className="text-sm text-gray-600">Descripción: {attraction.inspectable?.description}</p>
                                <p className="text-sm text-gray-600">Premisa: {getPremiseName(attraction.inspectable?.premise_id)}</p>
                                <p className="text-sm text-gray-600">Público: {attraction.public_flag}</p>
                                <p className="text-sm text-gray-600">Capacidad: {attraction.capacity}</p>
                                {attraction.inspectable?.photo_url && (
                                    <img src={`${API_BASE_URL}${attraction.inspectable.photo_url}`} alt="Foto de identificación" className="w-20 h-20 object-cover mt-2 rounded" />
                                )}
                            </div>
                            <div>
                                <button
                                    onClick={() => handleEditClick(attraction)}
                                    className="mr-2 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteAttraction(attraction.ins_id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {editingAttraction && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
                        <h3 className="text-xl font-semibold mb-4">Editar Atracción</h3>
                        <form onSubmit={handleUpdateAttraction} className="space-y-4">
                            <div>
                                <label htmlFor="edit_attraction_name" className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    id="edit_attraction_name"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingAttraction.name}
                                    onChange={(e) => setEditingAttraction({ ...editingAttraction, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_attraction_description" className="block text-sm font-medium text-gray-700">Descripción</label>
                                <input
                                    type="text"
                                    id="edit_attraction_description"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingAttraction.description}
                                    onChange={(e) => setEditingAttraction({ ...editingAttraction, description: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_attraction_premise" className="block text-sm font-medium text-gray-700">Premisa</label>
                                <select
                                    id="edit_attraction_premise"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingAttraction.premise_id}
                                    onChange={(e) =>
                                        setEditingAttraction({
                                            ...editingAttraction,
                                            premise_id: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Selecciona una premisa</option>
                                    {premises.map((premise) => (
                                        <option key={premise.premise_id} value={premise.premise_id}>
                                            {premise.premise_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit_attraction_public_flag" className="block text-sm font-medium text-gray-700">Flag Público</label>
                                <select
                                    id="edit_attraction_public_flag"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingAttraction.public_flag}
                                    onChange={(e) => setEditingAttraction({ ...editingAttraction, public_flag: e.target.value })}
                                    required
                                >
                                    <option value="">Selecciona un estado</option>
                                    <option value="Sí">Sí</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit_attraction_capacity" className="block text-sm font-medium text-gray-700">Capacidad</label>
                                <input
                                    type="number"
                                    id="edit_attraction_capacity"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingAttraction.capacity}
                                    onChange={(e) => setEditingAttraction({ ...editingAttraction, capacity: e.target.value })}
                                    required
                                />
                            </div>
                            <div> {/* Campo para la selección de archivo y vista previa */}
                                <label htmlFor="edit_attraction_photo" className="block text-sm font-medium text-gray-700">Cambiar Foto</label>
                                <input
                                    type="file"
                                    id="edit_attraction_photo"
                                    className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                                    onChange={(e) => setEditingAttractionPhoto(e.target.files[0])}
                                    accept="image/*"
                                />
                                {editingAttractionPhoto && (
                                    <p className="text-sm text-gray-500 mt-1">Archivo seleccionado: {editingAttractionPhoto.name}</p>
                                )}
                                {editingAttraction.photo_url && !editingAttractionPhoto && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600">Foto actual:</p>
                                        <img src={editingAttraction.photo_url} alt="Foto actual" className="w-20 h-20 object-cover rounded" />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingAttraction(null)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                                >
                                    Actualizar Atracción
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttractionManagement;

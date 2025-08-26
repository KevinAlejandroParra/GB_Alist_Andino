import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API || "http://localhost:5000";

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [families, setFamilies] = useState([]);
    const [premises, setPremises] = useState([]);
    const [newDevice, setNewDevice] = useState({
        family_id: '',
        name: '',
        description: '',
        premise_id: '',
        public_flag: '',
        arrival_date: '',
        brand: '',
    });
    const [editingDevice, setEditingDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [devicesResponse, familiesResponse, premisesResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/devices`),
                axios.get(`${API_BASE_URL}/api/families`),
                axios.get(`${API_BASE_URL}/api/premises`),
            ]);
            setDevices(devicesResponse.data);
            setFamilies(familiesResponse.data);
            setPremises(premisesResponse.data.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const getFamilyName = (family_id) => {
        const family = families.find((fam) => fam.family_id === family_id);
        return family ? family.family_name : 'Desconocida';
    };

    const getPremiseName = (premise_id) => {
        const premise = premises.find((prem) => prem.premise_id === premise_id);
        return premise ? premise.premise_name : 'Desconocida';
    };

    const handleCreateDevice = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${API_BASE_URL}/api/devices`, newDevice);
            setDevices([...devices, response.data]);
            setNewDevice({
                family_id: '',
                name: '',
                description: '',
                premise_id: '',
                public_flag: '',
                arrival_date: '',
                brand: '',
            });
            setError(null);
            fetchData(); 
        } catch (err) {
            console.error("Error creating device:", err);
            setError("Error al crear el dispositivo.");
        }
    };

    const handleEditClick = (device) => {
        setEditingDevice({
            ...device,
            name: device.inspectable?.name || '',
            description: device.inspectable?.description || '',
            premise_id: device.inspectable?.premise_id || '',
        });
    };

    const handleUpdateDevice = async (e) => {
        e.preventDefault();
        try {
            const { name, description, premise_id, ...deviceData } = editingDevice;
            const payload = {
                ...deviceData,
                name: name,
                description: description,
                premise_id: premise_id,
            };
            const response = await axios.put(`${API_BASE_URL}/api/devices/${editingDevice.ins_id}`, payload);
            setDevices(devices.map((dev) => (dev.ins_id === editingDevice.ins_id ? response.data.device : dev)));
            setEditingDevice(null);
            setError(null);
            fetchData(); 
        } catch (err) {
            console.error("Error updating device:", err);
            setError("Error al actualizar el dispositivo.");
        }
    };

    const handleDeleteDevice = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/devices/${id}`);
            setDevices(devices.filter((dev) => dev.ins_id !== id));
            setError(null);
        } catch (err) {
            console.error("Error deleting device:", err);
            if (err.response && err.response.status === 400) {
                setError(err.response.data.message);
            } else {
                setError("Error al eliminar el dispositivo.");
            }
        }
    };

    if (loading) return <p>Cargando dispositivos...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Gestión de Dispositivos</h2>

            <div className="mb-8 p-4 border rounded shadow">
                <h3 className="text-xl font-semibold mb-2">Crear Nuevo Dispositivo</h3>
                <form onSubmit={handleCreateDevice} className="space-y-4">
                    <div>
                        <label htmlFor="new_device_name" className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input
                            type="text"
                            id="new_device_name"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.name}
                            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new_device_description" className="block text-sm font-medium text-gray-700">Descripción</label>
                        <input
                            type="text"
                            id="new_device_description"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.description}
                            onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new_device_family" className="block text-sm font-medium text-gray-700">Familia</label>
                        <select
                            id="new_device_family"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.family_id}
                            onChange={(e) => setNewDevice({ ...newDevice, family_id: e.target.value })}
                            required
                        >
                            <option value="">Selecciona una familia</option>
                            {families.map((family) => (
                                <option key={family.family_id} value={family.family_id}>
                                    {family.family_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="new_device_premise" className="block text-sm font-medium text-gray-700">Sede</label>
                        <select
                            id="new_device_premise"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.premise_id}
                            onChange={(e) => setNewDevice({ ...newDevice, premise_id: e.target.value })}
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
                        <label htmlFor="new_device_public_flag" className="block text-sm font-medium text-gray-700">Flag Público</label>
                        <select
                            id="new_device_public_flag"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.public_flag}
                            onChange={(e) => setNewDevice({ ...newDevice, public_flag: e.target.value })}
                            required
                        >
                            <option value="">Disponible al publico?</option>
                            <option value="Sí">Sí</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="new_device_arrival_date" className="block text-sm font-medium text-gray-700">Fecha de Llegada</label>
                        <input
                            type="date"
                            id="new_device_arrival_date"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.arrival_date}
                            onChange={(e) => setNewDevice({ ...newDevice, arrival_date: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="new_device_brand" className="block text-sm font-medium text-gray-700">Marca</label>
                        <input
                            type="text"
                            id="new_device_brand"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            value={newDevice.brand}
                            onChange={(e) => setNewDevice({ ...newDevice, brand: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                    >
                        Crear Dispositivo
                    </button>
                </form>
            </div>

            <div className="mb-8 p-4 border rounded shadow">
                <h3 className="text-xl font-semibold mb-2">Lista de Dispositivos</h3>
                <ul className="space-y-2">
                    {devices.map((device) => (
                        <li key={device.ins_id} className="flex justify-between items-center p-3 border rounded-md bg-gray-50">
                            <div>
                                <p className="font-semibold">{device.inspectable?.name} ({device.brand})</p>
                                <p className="text-sm text-gray-600">Descripción: {device.inspectable?.description}</p>
                                <p className="text-sm text-gray-600">Familia: {getFamilyName(device.family_id)}</p>
                                <p className="text-sm text-gray-600">Premisa: {getPremiseName(device.inspectable?.premise_id)}</p>
                                <p className="text-sm text-gray-600">Público: {device.public_flag}</p>
                                <p className="text-sm text-gray-600">Llegada: {new Date(device.arrival_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <button
                                    onClick={() => handleEditClick(device)}
                                    className="mr-2 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteDevice(device.ins_id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {editingDevice && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
                        <h3 className="text-xl font-semibold mb-4">Editar Dispositivo</h3>
                        <form onSubmit={handleUpdateDevice} className="space-y-4">
                            <div>
                                <label htmlFor="edit_device_name" className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    id="edit_device_name"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.name}
                                    onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_device_description" className="block text-sm font-medium text-gray-700">Descripción</label>
                                <input
                                    type="text"
                                    id="edit_device_description"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.description}
                                    onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_device_family" className="block text-sm font-medium text-gray-700">Familia</label>
                                <select
                                    id="edit_device_family"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.family_id}
                                    onChange={(e) => setEditingDevice({ ...editingDevice, family_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecciona una familia</option>
                                    {families.map((family) => (
                                        <option key={family.family_id} value={family.family_id}>
                                            {family.family_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit_device_premise" className="block text-sm font-medium text-gray-700">Premisa</label>
                                <select
                                    id="edit_device_premise"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.premise_id}
                                    onChange={(e) =>
                                        setEditingDevice({
                                            ...editingDevice,
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
                                <label htmlFor="edit_device_public_flag" className="block text-sm font-medium text-gray-700">Flag Público</label>
                                <select
                                    id="edit_device_public_flag"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.public_flag}
                                    onChange={(e) => setEditingDevice({ ...editingDevice, public_flag: e.target.value })}
                                    required
                                >
                                    <option value="">Selecciona un estado</option>
                                    <option value="Sí">Sí</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit_device_arrival_date" className="block text-sm font-medium text-gray-700">Fecha de Llegada</label>
                                <input
                                    type="date"
                                    id="edit_device_arrival_date"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.arrival_date ? new Date(editingDevice.arrival_date).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEditingDevice({ ...editingDevice, arrival_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_device_brand" className="block text-sm font-medium text-gray-700">Marca</label>
                                <input
                                    type="text"
                                    id="edit_device_brand"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={editingDevice.brand}
                                    onChange={(e) => setEditingDevice({ ...editingDevice, brand: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingDevice(null)}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                                >
                                    Actualizar Dispositivo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceManagement;

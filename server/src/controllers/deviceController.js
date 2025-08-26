const { Device, Family, Inspectable } = require("../models");

const deviceController = {
    // Obtener todos los dispositivos 
    async getAllDevices(req, res) {
        try {
            const { family_id } = req.query;
            const whereClause = family_id ? { family_id } : {};
            const devices = await Device.findAll({
                where: whereClause,
                include: [
                    { model: Family, as: "family" },
                    { model: Inspectable, as: "inspectable" },
                ],
            });
            res.status(200).json(devices);
        } catch (error) {
            console.error("Error al obtener todos los dispositivos:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener dispositivos." });
        }
    },

    // Obtener un dispositivo por ID (incluyendo la familia y la atracción a la que esté vinculado)
    async getDeviceById(req, res) {
        try {
            const device = await Device.findByPk(req.params.id, {
                include: [
                    { model: Family, as: "family" },
                    { model: Inspectable, as: "inspectable" },
                ],
            });
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado." });
            }
            res.status(200).json(device);
        } catch (error) {
            console.error("Error al obtener dispositivo por ID:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener dispositivo." });
        }
    },

    // Crear un nuevo dispositivo (con validación de familia existente)
    async createDevice(req, res) {
        try {
            const { family_id, name, description, premise_id, public_flag, arrival_date, brand } = req.body;

            // Validar que la familia exista
            const family = await Family.findByPk(family_id);
            if (!family) {
                return res.status(400).json({ message: "La familia especificada no existe." });
            }

            // Crear primero el Inspectable
            const inspectable = await Inspectable.create({
                name,
                description,
                type_code: 'device',
                premise_id,
            });

            // Crear el Device, vinculándolo al Inspectable y a la Family
            const newDevice = await Device.create({
                ins_id: inspectable.ins_id,
                family_id,
                public_flag,
                arrival_date,
                brand,
            });

            res.status(201).json(newDevice);
        } catch (error) {
            console.error("Error al crear dispositivo:", error);
            res.status(500).json({ message: "Error interno del servidor al crear dispositivo." });
        }
    },

    // Actualizar datos de un dispositivo
    async updateDevice(req, res) {
        try {
            const deviceId = req.params.id;
            const { family_id, name, description, premise_id, public_flag, arrival_date, brand } = req.body;

            const device = await Device.findByPk(deviceId);
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado." });
            }

            // Validar que la familia exista si se proporciona
            if (family_id) {
                const family = await Family.findByPk(family_id);
                if (!family) {
                    return res.status(400).json({ message: "La familia especificada no existe." });
                }
            }

            // Actualizar el Inspectable asociado
            await Inspectable.update(
                { name, description, premise_id, type_code: 'device' }, 
                { where: { ins_id: device.ins_id } }
            );

            // Actualizar el Device
            const [updated] = await Device.update(
                { family_id, public_flag, arrival_date, brand },
                { where: { ins_id: deviceId } }
            );

            if (updated) {
                const updatedDevice = await Device.findByPk(deviceId, {
                    include: [
                        { model: Family, as: "family" },
                        { model: Inspectable, as: "inspectable" },
                    ],
                });
                return res.status(200).json({ message: "Dispositivo actualizado correctamente.", device: updatedDevice });
            }
            throw new Error("Error al actualizar el dispositivo.");
        } catch (error) {
            console.error("Error al actualizar dispositivo:", error);
            res.status(500).json({ message: "Error interno del servidor al actualizar dispositivo." });
        }
    },

    // Eliminar un dispositivo
    async deleteDevice(req, res) {
        try {
            const deviceId = req.params.id;

            const device = await Device.findByPk(deviceId);
            if (!device) {
                return res.status(404).json({ message: "Dispositivo no encontrado." });
            }

            const deleted = await Device.destroy({ where: { ins_id: deviceId } });
            if (deleted) {
                // También eliminar el Inspectable asociado
                await Inspectable.destroy({ where: { ins_id: device.ins_id } });
                return res.status(200).json({ message: "Dispositivo eliminado correctamente." });
            }
            throw new Error("Error al eliminar el dispositivo.");
        } catch (error) {
            console.error("Error al eliminar dispositivo:", error);
            res.status(500).json({ message: "Error interno del servidor al eliminar dispositivo." });
        }
    },
};

module.exports = deviceController;

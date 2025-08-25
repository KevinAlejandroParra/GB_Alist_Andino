const { Family, Device } = require("../models");

const familyController = {
    // Obtener todas las familias
    async getAllFamilies(req, res) {
        try {
            const families = await Family.findAll();
            res.status(200).json(families);
        } catch (error) {
            console.error("Error al obtener todas las familias:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener familias." });
        }
    },

    // Obtener una familia por ID y sus dispositivos
    async getFamilyById(req, res) {
        try {
            const family = await Family.findByPk(req.params.id, {
                include: {
                    model: Device,
                    as: "devices",
                },
            });
            if (!family) {
                return res.status(404).json({ message: "Familia no encontrada." });
            }
            res.status(200).json(family);
        } catch (error) {
            console.error("Error al obtener familia por ID:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener familia." });
        }
    },

    // Crear una nueva familia
    async createFamily(req, res) {
        try {
            const { family_name, family_description } = req.body;
            if (!family_name || !family_description) {
                return res.status(400).json({ message: "El nombre y la descripción de la familia son obligatorios." });
            }
            const newFamily = await Family.create({ family_name, family_description });
            res.status(201).json(newFamily);
        } catch (error) {
            console.error("Error al crear familia:", error);
            res.status(500).json({ message: "Error interno del servidor al crear familia." });
        }
    },

    // Actualizar datos de una familia
    async updateFamily(req, res) {
        try {
            const { family_name, family_description } = req.body;
            const [updated] = await Family.update({ family_name, family_description }, {
                where: { family_id: req.params.id },
            });
            if (updated) {
                const updatedFamily = await Family.findByPk(req.params.id);
                return res.status(200).json({ message: "Familia actualizada correctamente.", family: updatedFamily });
            }
            throw new Error("Familia no encontrada.");
        } catch (error) {
            console.error("Error al actualizar familia:", error);
            res.status(500).json({ message: "Error interno del servidor al actualizar familia." });
        }
    },

    // Eliminar una familia
    async deleteFamily(req, res) {
        try {
            const familyId = req.params.id;
            // Verificar si la familia tiene dispositivos asociados
            const devicesCount = await Device.count({
                where: { family_id: familyId },
            });

            if (devicesCount > 0) {
                // Si hay dispositivos asociados, se implementa un soft delete
                await Family.update({ is_deleted: true }, { where: { family_id: familyId } });
                return res.status(200).json({ message: 'Familia marcada como eliminada (soft delete).' });
            }

            const deleted = await Family.destroy({
                where: { family_id: familyId },
            });

            if (deleted) {
                return res.status(200).json({ message: "Familia eliminada correctamente." });
            }
            throw new Error("Familia no encontrada.");
        } catch (error) {
            console.error("Error al eliminar familia:", error);
            res.status(500).json({ message: "Error interno del servidor al eliminar familia." });
        }
    },
};

module.exports = familyController;

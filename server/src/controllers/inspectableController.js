
const { Premise, Inspectable, Device, Attraction, ChecklistType } = require("../models");

const inspectableController = {
    async getAllInspectables(req, res) {
        try {
            const attractions = await Attraction.findAll({
                include: [
                    { model: Inspectable, as: "parentInspectable", include: [{ model: Premise, as: "premise" }] }
                ],
            });
            const devices = await Device.findAll({
                include: [
                    { model: Inspectable, as: "parentInspectable", include: [{ model: Premise, as: "premise" }] }
                ],
            });

            const allInspectables = [];

            attractions.forEach(attraction => {
                if (attraction.parentInspectable) {
                    allInspectables.push({
                        inspectable_id: attraction.parentInspectable.ins_id,
                        inspectable_name: attraction.parentInspectable.name,
                        inspectable_type: attraction.parentInspectable.type_code,
                        location: attraction.parentInspectable.premise ? attraction.parentInspectable.premise.premise_name : 'Sin ubicación',
                        premise_id: attraction.parentInspectable.premise_id,
                        default_checklist_type_id: null // No disponible en esta consulta simplificada
                    });
                }
            });

            devices.forEach(device => {
                if (device.parentInspectable) {
                    allInspectables.push({
                        inspectable_id: device.parentInspectable.ins_id,
                        inspectable_name: device.parentInspectable.name,
                        inspectable_type: device.parentInspectable.type_code,
                        location: device.parentInspectable.premise ? device.parentInspectable.premise.premise_name : 'Sin ubicación',
                        premise_id: device.parentInspectable.premise_id,
                        default_checklist_type_id: null // No disponible en esta consulta simplificada
                    });
                }
            });

            res.status(200).json({
                success: true,
                data: allInspectables
            });
        } catch (error) {
            console.error("Error al obtener todos los inspectables:", error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor al obtener inspectables.",
                error: error.message
            });
        }
    },

    getPremisesWithInspectables: async (req, res) => {
        try {
            const premises = await Premise.findAll({
                include: [
                    {
                        model: Inspectable,
                        as: "inspectables",
                        include: [
                            {
                                model: Device,
                                as: "deviceData",
                                required: false,
                                where: { '$inspectables.type_code$': 'device' } 
                            },
                            {
                                model: Attraction,
                                as: "attractionData",
                                required: false,
                                where: { '$inspectables.type_code$': 'attraction' } 
                            },
                        ],
                    },
                ],
            });

            res.status(200).json(premises);
        } catch (error) {
            console.error("Error al obtener sedes con inspeccionables:", error);
            res.status(500).json({ message: "Error interno del servidor", error: error.message });
        }
    },

    async getInspectableById(req, res) {
        try {
            const { id } = req.params;
            const inspectable = await Inspectable.findByPk(id, {
                include: [
                    { model: Premise, as: "premise" },
                    { model: Device, as: "deviceData", required: false },
                    { model: Attraction, as: "attractionData", required: false },
                ],
            });

            if (!inspectable) {
                return res.status(404).json({ message: "Inspectable no encontrado." });
            }

            res.status(200).json(inspectable);
        } catch (error) {
            console.error("Error al obtener inspectable por ID:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener inspectable.", error: error.message });
        }
    }
};

module.exports = inspectableController;

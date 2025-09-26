
const { Premise, Inspectable, Device, Attraction, ChecklistType } = require("../models");

const inspectableController = {
    async getAllInspectables(req, res) {
        try {
            const attractions = await Attraction.findAll({
                include: [
                    { model: Inspectable, as: "inspectable", include: [{ model: Premise, as: "premise" }] },
                    { 
                        model: ChecklistType, as: "checklistType", 
                        required: false, 
                        attributes: ['checklist_type_id'], // Usar checklist_type_id como ID
                        where: { attraction_id: { [require('sequelize').Op.col]: 'Attraction.ins_id' } } 
                    }
                ],
            });
            const devices = await Device.findAll({
                include: [
                    { model: Inspectable, as: "inspectable", include: [{ model: Premise, as: "premise" }] },
                    { 
                        model: ChecklistType, as: "checklistType", 
                        required: false, 
                        attributes: ['checklist_type_id'], // Usar checklist_type_id como ID
                        where: { family_id: { [require('sequelize').Op.col]: 'Device.family_id' } } 
                    }
                ],
            });

            const allInspectables = [];

            attractions.forEach(attraction => {
                if (attraction.inspectable) {
                    allInspectables.push({
                        inspectable_id: attraction.inspectable.ins_id,
                        inspectable_name: attraction.inspectable.name,
                        inspectable_type: attraction.inspectable.type_code,
                        location: attraction.inspectable.premise.premise_name,
                        premise_id: attraction.inspectable.premise_id,
                        default_checklist_type_id: attraction.checklistType ? attraction.checklistType.checklist_type_id : null, // Usar checklist_type_id
                    });
                }
            });

            devices.forEach(device => {
                if (device.inspectable) {
                    allInspectables.push({
                        inspectable_id: device.inspectable.ins_id,
                        inspectable_name: device.inspectable.name,
                        inspectable_type: device.inspectable.type_code,
                        location: device.inspectable.premise.premise_name,
                        premise_id: device.inspectable.premise_id,
                        default_checklist_type_id: device.checklistType ? device.checklistType.checklist_type_id : null, // Usar checklist_type_id
                    });
                }
            });

            res.status(200).json(allInspectables);
        } catch (error) {
            console.error("Error al obtener todos los inspectables:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener inspectables.", error: error.message });
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

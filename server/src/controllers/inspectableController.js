
const { Premise, Inspectable, Device, Attraction } = require("../models");

const inspectableController = {
    async getAllInspectables(req, res) {
        try {
            const attractions = await Attraction.findAll({
                include: [
                    { model: Inspectable, as: "inspectable", include: [{ model: Premise, as: "premise" }] },
                ],
            });
            const devices = await Device.findAll({
                include: [
                    { model: Inspectable, as: "inspectable", include: [{ model: Premise, as: "premise" }] },
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
                        premise_id: attraction.inspectable.premise_id, // Añadir premise_id
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
                        premise_id: device.inspectable.premise_id, // Añadir premise_id
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
};

module.exports = inspectableController;

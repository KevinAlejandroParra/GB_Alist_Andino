
const { Premise, Inspectable, Device, Attraction } = require("../models");

const getPremisesWithInspectables = async (req, res) => {
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
};

module.exports = {
    getPremisesWithInspectables,
};

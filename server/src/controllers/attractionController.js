const { Attraction, Inspectable } = require("../models");

const attractionController = {
    // Obtener todas las atracciones
    async getAllAttractions(req, res) {
        try {
            const attractions = await Attraction.findAll({
                include: [
                    { model: Inspectable, as: "inspectable" },
                ],
            });
            res.status(200).json(attractions);
        } catch (error) {
            console.error("Error al obtener todas las atracciones:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener atracciones." });
        }
    },

    // Obtener una atracción por ID (incluyendo dispositivos asociados)
    async getAttractionById(req, res) {
        try {
            const attraction = await Attraction.findByPk(req.params.id, {
                include: [
                    { model: Inspectable, as: "inspectable" },
                ],
            });
            if (!attraction) {
                return res.status(404).json({ message: "Atracción no encontrada." });
            }
            res.status(200).json(attraction);
        } catch (error) {
            console.error("Error al obtener atracción por ID:", error);
            res.status(500).json({ message: "Error interno del servidor al obtener atracción." });
        }
    },

    // Crear una nueva atracción
    async createAttraction(req, res) {
        try {
            const { name, description, premise_id, public_flag, capacity } = req.body;

            // Crear primero el Inspectable
            const inspectable = await Inspectable.create({
                name,
                description,
                type_code: 'attraction',
                premise_id,
            });

            // Crear la Attraction, vinculándola al Inspectable
            const newAttraction = await Attraction.create({
                ins_id: inspectable.ins_id, 
                public_flag,
                capacity,
            });

            res.status(201).json(newAttraction);
        } catch (error) {
            console.error("Error al crear atracción:", error);
            res.status(500).json({ message: "Error interno del servidor al crear atracción." });
        }
    },

    // Actualizar datos de una atracción
    async updateAttraction(req, res) {
        try {
            const attractionId = req.params.id;
            const { name, description, premise_id, public_flag, capacity } = req.body;

            const attraction = await Attraction.findByPk(attractionId);
            if (!attraction) {
                return res.status(404).json({ message: "Atracción no encontrada." });
            }

            // Actualizar el Inspectable asociado
            await Inspectable.update(
                { name, description, premise_id, type_code: 'attraction' }, 
                { where: { ins_id: attraction.ins_id } }
            );

            // Actualizar la Attraction
            const [updated] = await Attraction.update(
                { public_flag, capacity },
                { where: { ins_id: attractionId } }
            );

            if (updated) {
                const updatedAttraction = await Attraction.findByPk(attractionId, {
                    include: [
                        { model: Inspectable, as: "inspectable" },
                    ],
                });
                return res.status(200).json({ message: "Atracción actualizada correctamente.", attraction: updatedAttraction });
            }
            throw new Error("Error al actualizar la atracción.");
        } catch (error) {
            console.error("Error al actualizar atracción:", error);
            res.status(500).json({ message: "Error interno del servidor al actualizar atracción." });
        }
    },

    // Eliminar una atracción
    async deleteAttraction(req, res) {
        try {
            const attractionId = req.params.id;

            const attraction = await Attraction.findByPk(attractionId);
            if (!attraction) {
                return res.status(404).json({ message: "Atracción no encontrada." });
            }

            const deleted = await Attraction.destroy({ where: { ins_id: attractionId } });
            if (deleted) {
                await Inspectable.destroy({ where: { ins_id: attraction.ins_id } });
                return res.status(200).json({ message: "Atracción eliminada correctamente." });
            }
            throw new Error("Error al eliminar la atracción.");
        } catch (error) {
            console.error("Error al eliminar atracción:", error);
            res.status(500).json({ message: "Error interno del servidor al eliminar atracción." });
        }
    },
};

module.exports = attractionController;

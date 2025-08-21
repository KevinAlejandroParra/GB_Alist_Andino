
const { Premise } = require('../models');

const premiseController = {
    // Obtener todas las sedes
    getAllPremises: async (req, res) => {
        try {
            const premises = await Premise.findAll();
            res.status(200).json({
                success: true,
                data: premises
            });
        } catch (error) {
            console.error('Error al obtener sedes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener sedes',
                error: error.message
            });
        }
    },

    // Obtener una sede por ID
    getPremiseById: async (req, res) => {
        try {
            const { id } = req.params;
            const premise = await Premise.findByPk(id);
            if (!premise) {
                return res.status(404).json({
                    success: false,
                    message: 'Sede no encontrada'
                });
            }
            res.status(200).json({
                success: true,
                data: premise
            });
        } catch (error) {
            console.error('Error al obtener sede por ID:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener sede por ID',
                error: error.message
            });
        }
    },

    // Crear una nueva sede
    createPremise: async (req, res) => {
        try {
            const { premise_name, premise_address } = req.body;
            const newPremise = await Premise.create({
                premise_name,
                premise_address
            });
            res.status(201).json({
                success: true,
                message: 'Sede creada exitosamente',
                data: newPremise
            });
        } catch (error) {
            console.error('Error al crear sede:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear sede',
                error: error.message
            });
        }
    },

    // Actualizar una sede existente
    updatePremise: async (req, res) => {
        try {
            const { id } = req.params;
            const { premise_name, premise_address } = req.body;
            const [updated] = await Premise.update({
                premise_name,
                premise_address
            }, {
                where: { premise_id: id }
            });

            if (updated) {
                const updatedPremise = await Premise.findByPk(id);
                return res.status(200).json({
                    success: true,
                    message: 'Sede actualizada exitosamente',
                    data: updatedPremise
                });
            }
            throw new Error('Sede no encontrada');
        } catch (error) {
            console.error('Error al actualizar sede:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar sede',
                error: error.message
            });
        }
    },

    // Eliminar una sede
    deletePremise: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Premise.destroy({
                where: { premise_id: id }
            });

            if (deleted) {
                return res.status(200).json({
                    success: true,
                    message: 'Sede eliminada exitosamente'
                });
            }
            throw new Error('Sede no encontrada');
        } catch (error) {
            console.error('Error al eliminar sede:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar sede',
                error: error.message
            });
        }
    }
};

module.exports = premiseController;


const { Entity, Premise } = require('../models');

const entityController = {
    // Obtener todas las entidades
    getAllEntities: async (req, res) => {
        try {
            const entities = await Entity.findAll({
                include: [
                    {
                        model: Premise,
                        as: 'premise',
                        attributes: ['premise_name']
                    }
                ],
                order: [
                    ['premise_id', 'ASC']
                ]
            });
            res.status(200).json({
                success: true,
                data: entities
            });
        } catch (error) {
            console.error('Error al obtener entidades:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener entidades',
                error: error.message
            });
        }
    },

    // Obtener una entidad por ID
    getEntityById: async (req, res) => {
        try {
            const { id } = req.params;
            const entity = await Entity.findByPk(id, {
                include: [
                    {
                        model: Premise,
                        as: 'premise',
                        attributes: ['premise_name']
                    }
                ]
            });
            if (!entity) {
                return res.status(404).json({
                    success: false,
                    message: 'Entidad no encontrada'
                });
            }
            res.status(200).json({
                success: true,
                data: entity
            });
        } catch (error) {
            console.error('Error al obtener entidad por ID:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener entidad por ID',
                error: error.message
            });
        }
    },

    // Crear una nueva entidad
    createEntity: async (req, res) => {
        try {
            const { entity_name, entity_description, premise_id } = req.body;
            const newEntity = await Entity.create({
                entity_name,
                entity_description,
                premise_id // Permitir la asignación de premise_id
            });
            res.status(201).json({
                success: true,
                message: 'Entidad creada exitosamente',
                data: newEntity
            });
        } catch (error) {
            console.error('Error al crear entidad:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear entidad',
                error: error.message
            });
        }
    },

    // Actualizar una entidad existente
    updateEntity: async (req, res) => {
        try {
            const { id } = req.params;
            const { entity_name, entity_description, premise_id } = req.body;
            const [updated] = await Entity.update({
                entity_name,
                entity_description,
                premise_id // Permitir la actualización de premise_id
            }, {
                where: { entity_id: id }
            });

            if (updated) {
                const updatedEntity = await Entity.findByPk(id, {
                    include: [
                        {
                            model: Premise,
                            as: 'premise',
                            attributes: ['premise_name']
                        }
                    ]
                });
                return res.status(200).json({
                    success: true,
                    message: 'Entidad actualizada exitosamente',
                    data: updatedEntity
                });
            }
            throw new Error('Entidad no encontrada');
        } catch (error) {
            console.error('Error al actualizar entidad:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar entidad',
                error: error.message
            });
        }
    },

    // Eliminar una entidad
    deleteEntity: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Entity.destroy({
                where: { entity_id: id }
            });

            if (deleted) {
                return res.status(200).json({
                    success: true,
                    message: 'Entidad eliminada exitosamente'
                });
            }
            throw new Error('Entidad no encontrada');
        } catch (error) {
            console.error('Error al eliminar entidad:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar entidad',
                error: error.message
            });
        }
    }
};

module.exports = entityController;

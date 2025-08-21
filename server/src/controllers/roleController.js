
const { Role } = require('../models');

const roleController = {
    // Obtener todos los roles
    getAllRoles: async (req, res) => {
        try {
            const roles = await Role.findAll();
            res.status(200).json({
                success: true,
                data: roles
            });
        } catch (error) {
            console.error('Error al obtener roles:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener roles',
                error: error.message
            });
        }
    },

    // Obtener un rol por ID
    getRoleById: async (req, res) => {
        try {
            const { id } = req.params;
            const role = await Role.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }
            res.status(200).json({
                success: true,
                data: role
            });
        } catch (error) {
            console.error('Error al obtener rol por ID:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener rol por ID',
                error: error.message
            });
        }
    },

    // Crear un nuevo rol
    createRole: async (req, res) => {
        try {
            const { role_name, role_description } = req.body;
            const newRole = await Role.create({
                role_name,
                role_description
            });
            res.status(201).json({
                success: true,
                message: 'Rol creado exitosamente',
                data: newRole
            });
        } catch (error) {
            console.error('Error al crear rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear rol',
                error: error.message
            });
        }
    },

    // Actualizar un rol existente
    updateRole: async (req, res) => {
        try {
            const { id } = req.params;
            const { role_name, role_description } = req.body;
            const [updated] = await Role.update({
                role_name,
                role_description
            }, {
                where: { role_id: id }
            });

            if (updated) {
                const updatedRole = await Role.findByPk(id);
                return res.status(200).json({
                    success: true,
                    message: 'Rol actualizado exitosamente',
                    data: updatedRole
                });
            }
            throw new Error('Rol no encontrado');
        } catch (error) {
            console.error('Error al actualizar rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar rol',
                error: error.message
            });
        }
    },

    // Eliminar un rol
    deleteRole: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Role.destroy({
                where: { role_id: id }
            });

            if (deleted) {
                return res.status(200).json({
                    success: true,
                    message: 'Rol eliminado exitosamente'
                });
            }
            throw new Error('Rol no encontrado');
        } catch (error) {
            console.error('Error al eliminar rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar rol',
                error: error.message
            });
        }
    }
};

module.exports = roleController;

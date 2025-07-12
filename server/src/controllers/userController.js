const path = require("path");
const { User } = require("../models");

class UserController {
static async getUsers(req, res){
    try{
        const page = req.query.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const { rows, count} = await User.findAndCountAll({
            limit,
            offset,
        });
        res.status(200).json({
            success: true,
            data: rows,
            total: count,
            message: "usuarios obtenidos correctamente"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: error.message,
            message: "Error al obtener los usuarios",
        });
    }
}

static async createUser(req, res) {
    try {
        const user = await User.create(req.body);
        res.status(201).json({
            success: true,
            data: user,
            message: "Usuario creado correctamente"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: error.message,
            message: "Error al crear el usuario",
        });
    }
}

static async updateUser(req, res) {
    try {
        const { user_id } = req.params;
        const [updated] = await User.update(req.body, {
            where: { user_id }
        });
        if (updated) {
            const updatedUser = await User.findByPk(user_id);
            res.status(200).json({
                success: true,
                data: updatedUser,
                message: "Usuario actualizado correctamente"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            data: error.message,
            message: "Error al actualizar el usuario",
        });
    }
}

static async deleteUser(req, res) {
    try {
        const { user_id } = req.params;
        const deleted = await User.destroy({
            where: { user_id }
        });
        if (deleted) {
            res.status(204).json({
                success: true,
                message: "Usuario desactivado correctamente"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            data: error.message,
            message: "Error al desactivar el usuario",
        });
    }
}

static async changeUserState(req, res) {
    try {
        const { user_id } = req.params;
        const user = await User.findByPk(user_id);
        if (user) {
            user.user_state = user.user_state === 'activo' ? 'inactivo' : 'activo';
            await user.save();
            res.status(200).json({
                success: true,
                data: user,
                message: "Estado del usuario cambiado correctamente"
            });
        } else {
            res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            data: error.message,
            message: "Error al cambiar el estado del usuario",
        });
    }
}
}

module.exports = UserController;

const path = require("path");
const { User } = require("../models");
const {Entity} = require("../models")
const {Premise} = require("../models")
const {Role} = require("../models")
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

class UserController {
static async getUsers(req, res) {
    try {

        const page = req.query.page || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const { rows, count } = await User.findAndCountAll({
            limit,
            offset,
        });

        console.log('Usuarios obtenidos:', rows); // Imprimir los usuarios obtenidos

        res.status(200).json({
            success: true,
            data: rows,
            total: count,
            message: "usuarios obtenidos correctamente"
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error); // Imprimir el error
        res.status(500).json({
            success: false,
            data: error.message,
            message: "Error al obtener los usuarios",
        });
    }
}


static async createUser(req, res) {
    try {
        // Validación adicional
        const requiredFields = [
            'user_name', 
            'user_email', 
            'user_document_type',
            'user_document',
            'user_phone',
            'premise_id',
            'user_password',
            'role_id'
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    message: `El campo ${field} es requerido`
                });
            }
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { user_email: req.body.user_email },
                    { user_document: req.body.user_document }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.user_email === req.body.user_email 
                    ? 'El correo electrónico ya está registrado' 
                    : 'El número de documento ya está registrado'
            });
        }

        // Crear el usuario
        const user = await User.create(req.body);
        
        // No devolver la contraseña en la respuesta
        const userData = user.get({ plain: true });
        delete userData.user_password;
        
        res.status(201).json({
            success: true,
            data: userData,
            message: "Usuario creado correctamente"
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'El correo o documento ya están registrados'
            });
        }
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: error.errors.map(e => e.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: "Error al crear el usuario",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

static async updateUser(req, res) {
    try {
        const userId = req.params.user_id; 
        let userJSON = {};

        try {
            if (req.body.user) {
                if (typeof req.body.user === "string") {
                    userJSON = JSON.parse(req.body.user);
                } else if (typeof req.body.user === "object") {
                    userJSON = req.body.user;
                }
            } else {
                userJSON = req.body; 
            }
        } catch (err) {
            console.error("Error al parsear JSON:", err);
            userJSON = req.body; 
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado",
            });
        }

        console.log("BODY:", req.body);
        console.log("USER PARSED:", userJSON);

        // Si hay imagen, actualizarla
        if (req.file) {
            const imagePath = path.join("images/users", req.file.filename).replace(/\\/g, "/");
            user.user_image = imagePath;
        }

        // Validación adicional para contraseña
        if (userJSON.user_password && userJSON.user_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "La contraseña debe tener al menos 8 caracteres",
            });
        }

        // Si se proporciona una nueva contraseña, encriptarla
        if (userJSON.user_password) {
            const salt = await bcrypt.genSalt(10);
            userJSON.user_password = await bcrypt.hash(userJSON.user_password, salt);
        }

        // Campos que se pueden actualizar
        const campos = [
            "user_name",
            "user_email",
            "user_phone",
            "user_document_type",
            "user_document",
            "user_password",
            "user_image"
        ];

        campos.forEach((campo) => {
            if (userJSON[campo] !== undefined) {
                user[campo] = userJSON[campo];
            }
        });

        await user.save();

        const userResponse = user.toJSON();
        delete userResponse.user_password;

        return res.status(200).json({
            success: true,
            user: userResponse,
            message: "Perfil actualizado correctamente",
        });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar el usuario",
            error: error.message,
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
            res.status(200).json({ 
                success: true,
                message: "Usuario eliminado correctamente"
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
            message: "Error al eliminar el usuario",
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

static async loginUser(req, res) {
    const { user_email, user_password } = req.body;
    try {
        const user = await User.findOne({ where: { user_email } });
        if (!user || !(await user.comparePassword(user_password))) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }
        const token = jwt.sign({ user_id: user.user_id, role_id: user.role_id }, process.env.JWT_KEY, { expiresIn: '1h' });
        res.status(200).json({
            success: true,
            token,
            message: 'Inicio de sesión exitoso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            data: error.message
        });
    }
}

static async logoutUser(req, res) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Sesión cerrada correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cerrar sesión',
            data: error.message
        });
    }
}

static async getProtectedData(req, res) {
    try {
        const user = await User.findOne({
            where: {
                user_id: req.user.user_id
            },
            include: [
                {
                    model: Entity, 
                    attributes: ['entity_name'], 
                    as: 'entity' 
                },
                {
                    model: Premise, 
                    attributes: ['premise_name'],
                    as: 'premise'
                },
                {
                    model: Role, 
                    attributes: ['role_name'],
                    as: 'role'
                }
            ]
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            });
        }
        
        // Formatear la respuesta
        const response = {
            success: true,
            user: {
                id: user.user_id,
                email: user.user_email,
                type_document: user.user_document_type,
                document: user.user_document,
                phone: user.user_phone,
                role: {
                    id: user.role_id,
                    name: user.role?.role_name || null 
                },
                name: user.user_name,
                lastname: user.user_lastname,
                image: user.user_image,
                state: user.user_state,
                premise: {
                    id: user.premise_id,
                    name: user.premise?.premise_name || null
                },
                entity: {
                    id: user.entity_id,
                    name: user.entity?.entity_name || null
                }
            }
        };
        
        return res.status(200).json(response);
    } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener los datos del usuario",
            error: error.message
        });
    }
}

static async updateUserAdmin(req, res) {
    try {
        // Verificar si el usuario que realiza la solicitud tiene role_id 1 (administrador)
        if (req.user.role_id !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.'
            });
        }

        const { user_id } = req.params;
        const { role_id, premise_id, entity_id } = req.body;

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (role_id !== undefined) {
            user.role_id = role_id;
        }
        if (premise_id !== undefined) {
            user.premise_id = premise_id;
        }
        if (entity_id !== undefined) {
            user.entity_id = entity_id;
        }

        await user.save();

        const userResponse = user.toJSON();
        delete userResponse.user_password;

        return res.status(200).json({
            success: true,
            user: userResponse,
            message: 'Datos de usuario actualizados por administrador correctamente'
        });

    } catch (error) {
        console.error('Error al actualizar datos de usuario por administrador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar datos de usuario por administrador',
            error: error.message
        });
    }
}
}

module.exports = UserController;
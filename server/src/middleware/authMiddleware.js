const jwt = require('jsonwebtoken');
const { User } = require('../models'); 

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No se proporcionó token de acceso"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.user = decoded; // Asegúrate de que el decoded contenga el role_id
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado"
        });
    }
};

// Middleware para verificar roles
const checkRole = (roles) => {
    return async (req, res, next) => {
        try {
            console.log('Verificando rol para el user_id:', req.user.user_id); // Imprimir el user_id

            const user = await User.findOne({ where: { user_id: req.user.user_id } });
            console.log('Usuario encontrado:', user); // Imprimir el usuario encontrado

            if (!user || !roles.includes(Number(user.role_id))) {
                console.log('Rol del usuario:', user ? user.role_id : 'Usuario no encontrado'); // Imprimir el rol del usuario
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado. Rol no autorizado.'
                });
            }
            next();
        } catch (error) {
            console.error('Error al verificar rol:', error); // Imprimir el error
            return res.status(500).json({
                success: false,
                message: 'Error al verificar rol',
                error: error.message
            });
        }
    };
};

module.exports = { verifyToken, checkRole }; 
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
}

module.exports = UserController;

const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
  
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No se proporcionó token de acceso"
        });
      }
  
      const decoded = jwt.verify(token, "fullsecret");
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado"
      });
    }
  }

module.exports = { verifyToken }; 
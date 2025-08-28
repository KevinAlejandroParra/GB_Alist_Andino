const express = require('express');
const app = express();
require('dotenv').config();
const port = 5000;
const userRoutes = require("./routes/userRoutes");
const premiseRoutes = require("./routes/premiseRoutes");
const entityRoutes = require("./routes/entityRoutes");
const roleRoutes = require("./routes/roleRoutes");
const familyRoutes = require("./routes/familyRoutes");
const deviceRoutes = require("./routes/deviceRoutes"); 
const attractionRoutes = require("./routes/attractionRoutes"); 
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
const path = require("path");
app.use(express.json());
const cors = require('cors');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.static(path.join(__dirname, "../public"), {
   setHeaders: (res, path) => {
    res.setHeader("Access-Control-Allow-Origin", "*");


    // Headers adicionales críticos
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Header para tipos MIME
    if (path.endsWith(".png")) {
      res.setHeader("Content-Type", "image/png");
    }
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
      res.setHeader("Content-Type", "image/jpeg");
    }
  }
}));

// Servir archivos estáticos desde el directorio de medios
app.use('/media', express.static(path.join(__dirname, '../public/media')));

app.use("/api/users", userRoutes);
app.use("/api/premises", premiseRoutes);
app.use("/api/entities", entityRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/devices", deviceRoutes); 
app.use("/api/attractions", attractionRoutes); 
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

module.exports = {
    app,
};

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});

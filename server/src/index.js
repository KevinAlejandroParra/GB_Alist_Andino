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
const inspectableRoutes = require("./routes/inspectableRoutes");
const checklistRoutes = require("./routes/checklist.routes");
const familyChecklistRoutes = require("./routes/familyChecklist.routes");
const checklistTypeRoutes = require("./routes/checklistTypeRoutes");
const workOrderRoutes = require("./routes/workOrderRoutes");
const qrCodeRoutes = require("./routes/qrCodeRoutes");
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
const path = require("path");
const cors = require('cors');

// Importar configuración de Multer para uso global
const multerConfig = require('./config/multerConfig');
const upload = multerConfig; // Alias para compatibilidad

// Configurar middleware en orden correcto
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Configurar body parsing DESPUÉS de CORS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Headers adicionales para CORS y tipos de contenido
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
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
app.use("/api/inspectables", inspectableRoutes); 
app.use("/api/checklists", checklistRoutes);
app.use("/api/checklists", familyChecklistRoutes);
app.use("/api", checklistTypeRoutes);
app.use("/api/work-orders", workOrderRoutes);
app.use("/api", qrCodeRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

module.exports = {
    app,
};

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});

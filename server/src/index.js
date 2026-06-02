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
const failureRoutes = require("./routes/failureRoutes");
const failureRequisitionRoutes = require("./routes/failureRequisitionRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const requisitionRoutes = require("./routes/requisitionRoutes");
const qrCodeRoutes = require("./routes/qrCodeRoutes");
const retroactiveSignatureRoutes = require("./routes/retroactiveSignatureRoutes");
const supportChecklistRoutes = require("./routes/supportChecklistRoutes");
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
const path = require("path");
const cors = require('cors');

const multerConfig = require('./config/multerConfig');
const upload = multerConfig;

app.use(cors({
  origin: [
    "https://192.168.57.96",
    "https://192.168.57.96:443",
    "https://192.168.57.96:8443",
    "http://192.168.57.96",
    "http://192.168.57.96:3001",
    "http://localhost:3000",
    "https://localhost:3000"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
}));

app.options('/{*path}', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
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
app.use("/api/failures", failureRoutes);
app.use("/api", failureRequisitionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/requisitions", requisitionRoutes);
app.use("/api", qrCodeRoutes);
app.use("/api/retroactive-signatures", retroactiveSignatureRoutes);
app.use("/api/support", supportChecklistRoutes);

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

module.exports = { app };

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});

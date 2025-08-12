    const express = require('express');
    const app = express();
    require('dotenv').config();
    const port = 5000;
    const userRoutes = require("./routes/userRoutes");
    const swaggerUi = require('swagger-ui-express');
    const swaggerFile = require('./swagger-output.json');
    app.use(express.json()); 
    const cors = require('cors');
    app.use(cors({
        origin: '*',
        credentials: true,
    }));

    app.use("/api/users", userRoutes);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

  app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en http://0.0.0.0:${port}`);
});
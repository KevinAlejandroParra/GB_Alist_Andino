    const express = require('express');
    const app = express();
    const port = 5000;
    const userRoutes = require("./routes/userRoutes");
    app.use(express.json()); 

    app.use("/api", userRoutes);

    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto http://localhost:${port}`);
    });
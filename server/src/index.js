    const express = require('express');
    const app = express();
    const port = 5000;
    const userRoutes = require("./routes/userRoutes");
    app.use(express.json()); 
    const cors = require('cors');
    app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true,
    }));
    app.use("/users", userRoutes);

    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto http://localhost:${port}`);
    });
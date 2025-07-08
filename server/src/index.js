    const express = require('express');
    const app = express();
    const port = 3000;

    app.use(express.json()); // Middleware para parsear JSON

    // Ruta de ejemplo
    app.get('/api/saludo', (req, res) => {
      res.json({ mensaje: '¡Hola desde mi API!' });
    });

    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto ${port}`);
    });
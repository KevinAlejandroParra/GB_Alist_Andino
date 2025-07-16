const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'API Alist Gamebox v1.0.0',
    description: 'Documentación de la API del sistema Alist Gamebox (Andino) v1.0.0',
  },
  host: 'localhost:5000',
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./index.js'];
console.log('Documentación de la API disponible en http://localhost:5000/api-docs');

swaggerAutogen(outputFile, endpointsFiles, doc);

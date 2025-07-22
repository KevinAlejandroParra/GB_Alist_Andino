const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'API Alist Gamebox v1.0.0',
    description: 'Documentación de la API del sistema Alist Gamebox (Andino) v1.0.0',
  },
  host: '192.168.57.200',
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./index.js'];
console.log('Documentación de la API disponible en http://192.168.57.200/api-docs');

swaggerAutogen(outputFile, endpointsFiles, doc);

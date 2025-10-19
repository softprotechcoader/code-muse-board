import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Code Muse Board API',
      version: '1.0.0',
      description: 'Real-time API for the Code Muse Board application with Socket.io integration',
    },
    servers: [ { url: 'http://localhost:3001', description: 'Development server' } ]
  },
  apis: ['./server.js']
};

const spec = swaggerJsdoc(swaggerOptions);
console.log(JSON.stringify(spec, null, 2));

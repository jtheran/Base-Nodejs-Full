
import swaggerJSDoc from 'swagger-jsdoc';
import config from '../config/config.js';
import path from 'path';

const isProduction = config.env === 'production';
const pathRoutes = path.resolve('src', 'routes', '*.routes.js');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API Plataforma de Madurez Digital',
    version: '1.0.0',
    description: 'Documentación de la API para gestión de empresas, usuarios y encuestas.',
    contact: {
                name: 'LSV-TECH S.A.S.',
                email: 'contacto@lsv-tech.com',
                url: 'https://www.lsv-tech.com/',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
                description: 'Licencia Gratuita',
            },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Servidor Ambiente Local',
    },
    {
      url: `http://201.219.216.217:${config.port}`,
      description: 'Servidor Ambiente de Test',
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  swaggerDefinition,
  apis: [pathRoutes], // <-- ajusta según tu estructura de rutas
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;

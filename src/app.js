import config  from './config/config.js';
import server  from './server.js';
import { initSocket } from './utils/socket.js';

    server.listen(config.app.port, '0.0.0.0', () => {
        initSocket(server);
        console.log(`
            🚀 Servidor Backend Base iniciado correctamente

            📍 Entorno: ${config.app.env}
            📍 Puerto: ${config.app.port}
            📍 URL: ${config.app.appUrl}
            📍 Versión API: ${config.app.apiVersion}
            📍 Prefijo API: ${config.app.apiPrefix}

            ✅ Configuración cargada correctamente
            ✅ Variables de entorno validadas
            ✅ Middlewares de seguridad activados
            ✅ ES Modules configurados

            📊 Próximos pasos:
            1. Configurar base de datos: npm run db:migrate
            2. Poblar datos iniciales: npm run db:seed
            3. Verificar configuración: npm run config:check
        `);
  });


 // Manejo graceful de shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n⚠️  Recibido ${signal}. Cerrando servidor...`);
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      console.error('❌ Forzando cierre del servidor');
      process.exit(1);
    }, 10000);
  };

  // Listen for shutdown signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Manejo de errores no capturados
  process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
    process.exit(1);
  });

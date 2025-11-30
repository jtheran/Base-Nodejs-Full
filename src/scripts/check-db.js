// scripts/check-database.js
import prisma from '../libs/prisma.js';

async function checkDatabase() {
  console.log('🔍 Verificando conexión a la base de datos...\n');

  try {
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');

    // Verificar tablas
    const userCount = await prisma.user.count();
    console.log(`✅ Tabla 'users': ${userCount} registros`);

    try {
      const auditLogCount = await prisma.auditLog.count();
      console.log(`✅ Tabla 'audit_logs': ${auditLogCount} registros`);
    } catch (error) {
      console.log(`⚠️  Tabla 'audit_logs': No disponible aún`);
    }

    try {
      const notificationCount = await prisma.notification.count();
      console.log(`✅ Tabla 'notifications': ${notificationCount} registros`);
    } catch (error) {
      console.log(`⚠️  Tabla 'notifications': No disponible aún`);
    }

    console.log('\n🎉 Base de datos verificada correctamente!');

  } catch (error) {
    console.error('❌ Error verificando la base de datos:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Solución: Ejecuta los siguientes comandos:');
      console.log('   npm run db:init');
    } else if (error.message.includes('adapter')) {
      console.log('\n💡 Solución: Estamos usando Prisma 7+ con nueva configuración');
      console.log('   Asegúrate de tener Prisma 5.8.0+ instalado');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
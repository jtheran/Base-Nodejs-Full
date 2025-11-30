import { encryptPass } from '../libs/bcrypt.js';
import constants from '../config/constant.js';
import config from '../config/config.js';
import prisma from '../libs/prisma.js';

const ROLES = constants.ROLES;
async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  // Crear roles si no existen (para SQLite necesitamos verificar manualmente)
  console.log('📝 Creando usuario administrador...');

  // Verificar si ya existe un usuario admin
  const existingAdmin = await prisma.user.findFirst({
    where: { email: config.admin.email }
  });

  if (!existingAdmin) {
    // Crear usuario administrador
    const hashedPassword = await encryptPass(config.admin.pass);
    
    const adminUser = await prisma.user.create({
      data: {
        email: config.admin.email,
        password: hashedPassword,
        name: config.admin.name,
        role: ROLES.SUPER_ADMIN,
      },
    });

    console.log('✅ Usuario administrador creado:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });
  } else {
    console.log('ℹ️  Usuario administrador ya existe');
  }

  console.log('🎉 Seeding completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
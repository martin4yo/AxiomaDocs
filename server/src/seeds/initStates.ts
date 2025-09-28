import prisma from '../lib/prisma';

async function initStates() {
  try {
    console.log('🌱 Inicializando estados del sistema...');

    // Estados predefinidos que el sistema necesita
    const estados = [
      {
        nombre: 'EN_TRAMITE',
        descripcion: 'Documento en proceso de tramitación',
        color: '#f59e0b',
        nivel: 3
      },
      {
        nombre: 'VIGENTE',
        descripcion: 'Documento vigente y al día',
        color: '#10b981',
        nivel: 1
      },
      {
        nombre: 'POR_VENCER',
        descripcion: 'Documento próximo a vencer',
        color: '#eab308',
        nivel: 5
      },
      {
        nombre: 'VENCIDO',
        descripcion: 'Documento vencido',
        color: '#ef4444',
        nivel: 10
      }
    ];

    // Obtener o crear usuario administrador para auditoría
    let adminUser = await prisma.usuario.findFirst({
      where: { esAdmin: true }
    });

    if (!adminUser) {
      console.log('📤 Creando usuario administrador por defecto...');
      adminUser = await prisma.usuario.create({
        data: {
          username: 'admin',
          password: '$2a$10$YourHashedPasswordHere', // Cambiar por hash real
          email: 'admin@axiomadocs.com',
          nombre: 'Admin',
          apellido: 'Sistema',
          esAdmin: true,
          activo: true
        }
      });
    }

    // Crear estados si no existen
    for (const estado of estados) {
      const existingEstado = await prisma.estado.findFirst({
        where: { nombre: estado.nombre }
      });

      if (!existingEstado) {
        await prisma.estado.create({
          data: {
            ...estado,
            createdBy: adminUser.id,
            updatedBy: adminUser.id
          }
        });
        console.log(`✅ Estado creado: ${estado.nombre}`);
      } else {
        console.log(`⏭️  Estado ya existe: ${estado.nombre}`);
      }
    }

    console.log('✨ Estados inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando estados:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initStates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default initStates;
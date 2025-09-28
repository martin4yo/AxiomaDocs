import prisma from '../src/lib/prisma';

async function main() {
  console.log('Iniciando seed de la base de datos...');

  try {
    // Crear el primer usuario admin si no existe
    const userCount = await prisma.usuario.count();
    if (userCount === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin', 10);

      const adminUser = await prisma.usuario.create({
        data: {
          username: 'admin',
          email: 'admin@axiomadocs.com',
          password: hashedPassword,
          nombre: 'Administrador',
          apellido: 'Sistema',
          esAdmin: true,
          activo: true,
        },
      });
      console.log('Usuario administrador creado:', adminUser.username);
    }

    // Obtener el ID del primer usuario para las relaciones
    const firstUser = await prisma.usuario.findFirst();
    if (!firstUser) {
      throw new Error('No se pudo encontrar un usuario para las relaciones');
    }

    // Crear estados por defecto si no existen
    const estadoCount = await prisma.estado.count();
    if (estadoCount === 0) {
      const estadosDefecto = [
        {
          nombre: 'En Trámite',
          descripcion: 'Documento en proceso de tramitación',
          color: '#f59e0b',
          nivel: 2,
          activo: true,
          createdBy: firstUser.id,
        },
        {
          nombre: 'Vigente',
          descripcion: 'Documento vigente y al día',
          color: '#10b981',
          nivel: 1,
          activo: true,
          createdBy: firstUser.id,
        },
        {
          nombre: 'Vencido',
          descripcion: 'Documento vencido',
          color: '#ef4444',
          nivel: 10,
          activo: true,
          createdBy: firstUser.id,
        },
        {
          nombre: 'Por Vencer',
          descripcion: 'Documento próximo a vencer',
          color: '#f97316',
          nivel: 8,
          activo: true,
          createdBy: firstUser.id,
        },
      ];

      for (const estado of estadosDefecto) {
        await prisma.estado.create({ data: estado });
      }
      console.log('Estados por defecto creados');
    }

    console.log('Seed completado exitosamente');
  } catch (error) {
    console.error('Error en seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
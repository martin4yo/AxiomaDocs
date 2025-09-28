import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    console.log('👤 Creando usuario administrador...');

    // Hashear contraseña por defecto
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear usuario admin
    const adminUser = await prisma.usuario.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@axiomadocs.com',
        nombre: 'Admin',
        apellido: 'Sistema',
        esAdmin: true,
        activo: true
      }
    });

    console.log('✅ Usuario admin creado/actualizado');
    console.log('📧 Email: admin@axiomadocs.com');
    console.log('🔑 Usuario: admin');
    console.log('🔒 Contraseña: admin123');

    // Crear estados básicos necesarios
    console.log('\n📋 Creando estados básicos...');

    const estados = [
      { nombre: 'EN_TRAMITE', descripcion: 'En trámite', color: '#f59e0b', nivel: 3 },
      { nombre: 'VIGENTE', descripcion: 'Vigente', color: '#10b981', nivel: 1 },
      { nombre: 'POR_VENCER', descripcion: 'Por vencer', color: '#eab308', nivel: 5 },
      { nombre: 'VENCIDO', descripcion: 'Vencido', color: '#ef4444', nivel: 10 }
    ];

    for (const estado of estados) {
      await prisma.estado.upsert({
        where: { nombre: estado.nombre },
        update: {},
        create: {
          ...estado,
          createdBy: adminUser.id,
          updatedBy: adminUser.id
        }
      });
      console.log(`✅ Estado creado: ${estado.nombre}`);
    }

    console.log('\n✨ Configuración inicial completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
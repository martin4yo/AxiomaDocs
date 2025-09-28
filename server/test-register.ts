import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_PROD_URL || process.env.DATABASE_URL
    }
  }
});

async function testRegister() {
  try {
    console.log('🧪 Probando registro de usuario...\n');

    await prisma.$connect();

    // Verificar usuarios actuales
    const currentUsers = await prisma.usuario.findMany({
      select: { id: true, username: true, email: true }
    });
    console.log('Usuarios actuales:', currentUsers);

    // Intentar crear un nuevo usuario
    const hashedPassword = await bcrypt.hash('test123', 10);
    const userCount = await prisma.usuario.count();

    console.log(`\nTotal usuarios existentes: ${userCount}`);
    console.log('Intentando crear usuario de prueba...');

    const newUser = await prisma.usuario.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        nombre: 'Usuario',
        apellido: 'Test',
        esAdmin: userCount === 0, // Primer usuario es admin
        activo: true
      }
    });

    console.log('✅ Usuario creado exitosamente:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Es Admin: ${newUser.esAdmin}`);

    // Limpiar - eliminar usuario de prueba
    await prisma.usuario.delete({
      where: { id: newUser.id }
    });
    console.log('\n🧹 Usuario de prueba eliminado');

  } catch (error) {
    console.error('❌ Error en prueba de registro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRegister().catch(console.error);
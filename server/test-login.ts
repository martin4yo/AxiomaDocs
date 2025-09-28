import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function testLogin() {
  try {
    console.log('🔍 Verificando datos del usuario admin...');

    const user = await prisma.usuario.findUnique({
      where: { username: 'admin' }
    });

    if (!user) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Username: ${user.username}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Admin: ${user.esAdmin}`);
    console.log(`  - Activo: ${user.activo}`);

    // Probar hash de contraseña
    const testPassword = 'admin123';
    const isValidPassword = await bcrypt.compare(testPassword, user.password);

    console.log(`\n🔐 Test contraseña "${testPassword}": ${isValidPassword ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);

    if (!isValidPassword) {
      console.log('\n🔧 Actualizando contraseña...');
      const newHash = await bcrypt.hash(testPassword, 10);

      await prisma.usuario.update({
        where: { id: user.id },
        data: { password: newHash }
      });

      console.log('✅ Contraseña actualizada');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
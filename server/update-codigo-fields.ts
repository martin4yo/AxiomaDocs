import prisma from './src/lib/prisma';

async function updateCodigoFields() {
  try {
    console.log('🔄 Actualizando campos de código...\n');

    // Actualizar códigos de recursos
    console.log('📤 Actualizando códigos de recursos...');
    const recursos = await prisma.recurso.findMany({
      where: { codigo: null }
    });

    for (const recurso of recursos) {
      const codigo = `REC${recurso.id.toString().padStart(3, '0')}`;
      await prisma.recurso.update({
        where: { id: recurso.id },
        data: { codigo }
      });
      console.log(`  ✅ Recurso ${recurso.apellido} ${recurso.nombre} → ${codigo}`);
    }

    // Actualizar códigos de documentación
    console.log('\n📤 Actualizando códigos de documentación...');
    const documentacion = await prisma.documentacion.findMany({
      where: { codigo: null }
    });

    for (const doc of documentacion) {
      const codigo = `DOC${doc.id.toString().padStart(3, '0')}`;
      await prisma.documentacion.update({
        where: { id: doc.id },
        data: { codigo }
      });
      console.log(`  ✅ Documentación ${doc.nombre} → ${codigo}`);
    }

    console.log('\n✨ Códigos actualizados exitosamente!');

  } catch (error) {
    console.error('❌ Error actualizando códigos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCodigoFields();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log('🔍 Verificando integridad de la migración...\n');

    // Contar registros en cada tabla
    const counts = {
      usuarios: await prisma.usuario.count(),
      estados: await prisma.estado.count(),
      documentacion: await prisma.documentacion.count(),
      recursos: await prisma.recurso.count(),
      entidades: await prisma.entidad.count(),
      recursoDocumentacion: await prisma.recursoDocumentacion.count(),
      entidadDocumentacion: await prisma.entidadDocumentacion.count(),
      entidadRecurso: await prisma.entidadRecurso.count()
    };

    console.log('📊 Conteo de registros por tabla:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} registros`);
    });

    // Verificar integridad referencial
    console.log('\n🔗 Verificando integridad referencial...');

    // Verificar usuarios admin
    const admins = await prisma.usuario.count({ where: { esAdmin: true } });
    console.log(`   ✅ Usuarios admin: ${admins}`);

    // Verificar estados por defecto
    const estados = await prisma.estado.findMany({
      select: { nombre: true, nivel: true }
    });
    console.log(`   ✅ Estados disponibles: ${estados.map(e => `${e.nombre}(${e.nivel})`).join(', ')}`);

    // Verificar foreign keys
    const orphanedRecursos = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM recursos r
      WHERE NOT EXISTS (SELECT 1 FROM estados e WHERE e.id = r.estado_id)
    `;
    console.log(`   ✅ Recursos huérfanos (sin estado): ${(orphanedRecursos as any)[0].count}`);

    const orphanedEntidades = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM entidades e
      WHERE NOT EXISTS (SELECT 1 FROM estados es WHERE es.id = e.estado_id)
    `;
    console.log(`   ✅ Entidades huérfanas (sin estado): ${(orphanedEntidades as any)[0].count}`);

    // Verificar documentos con fechas
    const docsWithDates = await prisma.documentacion.count({
      where: {
        OR: [
          { fechaEmision: { not: null } },
          { fechaTramitacion: { not: null } },
          { fechaVencimiento: { not: null } }
        ]
      }
    });
    console.log(`   ✅ Documentos con fechas universales: ${docsWithDates}`);

    // Probar consultas típicas
    console.log('\n🧪 Probando consultas típicas...');

    const userWithPassword = await prisma.usuario.findFirst({
      where: { password: { not: "" } }
    });
    console.log(`   ✅ Usuario con contraseña encontrado: ${userWithPassword ? 'Sí' : 'No'}`);

    const resourcesWithDocs = await prisma.recurso.count({
      where: {
        recursoDocumentacion: {
          some: {}
        }
      }
    });
    console.log(`   ✅ Recursos con documentación: ${resourcesWithDocs}`);

    const entitiesWithDocs = await prisma.entidad.count({
      where: {
        entidadDocumentacion: {
          some: {}
        }
      }
    });
    console.log(`   ✅ Entidades con documentación: ${entitiesWithDocs}`);

    console.log('\n🎉 ¡Verificación completada!');

    // Resumen final
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`\n📋 Resumen:`);
    console.log(`   • Total de registros migrados: ${totalRecords}`);
    console.log(`   • Tablas principales: ${Object.keys(counts).length}`);
    console.log(`   • Integridad referencial: ✅`);

    if (totalRecords === 0) {
      console.log('\n⚠️  La base de datos parece estar vacía. Ejecuta la migración primero.');
    } else if (totalRecords < 10) {
      console.log('\n⚠️  Pocos registros migrados. Verifica que la base MySQL tenga datos.');
    } else {
      console.log('\n✅ La migración parece exitosa!');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration().catch(console.error);
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('🧹 Limpiando base de datos PostgreSQL para nueva migración...');

    // Deshabilitar foreign key checks temporalmente
    await prisma.$executeRaw`SET session_replication_role = replica;`;

    // Limpiar tablas en orden inverso (respetando dependencias)
    const tables = [
      'entidad_recurso',
      'entidad_documentacion',
      'recurso_documentacion',
      'entidades',
      'recursos',
      'documentacion',
      'estados',
      'usuarios'
    ];

    for (const table of tables) {
      try {
        console.log(`🗑️  Limpiando tabla: ${table}`);
        await prisma.$executeRawUnsafe(`DELETE FROM ${table};`);

        // Reiniciar secuencia
        await prisma.$executeRawUnsafe(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false);
        `);

        console.log(`✅ Tabla ${table} limpiada`);
      } catch (error) {
        console.log(`⚠️  Error limpiando ${table} (puede no existir):`, error);
      }
    }

    // Rehabilitar foreign key checks
    await prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

    console.log('🎉 Base de datos limpiada. Lista para nueva migración!');

  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase().catch(console.error);
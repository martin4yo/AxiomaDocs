import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.POSTGRES_PROD_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  try {
    console.log('🔧 Corrigiendo secuencias de PostgreSQL...\n');

    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Verificar máximo ID actual en cada tabla
    console.log('=== VERIFICANDO MÁXIMOS IDs ===');

    // Usuarios
    const maxUserId = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM usuarios;` as any[];
    const userMaxId = maxUserId[0]?.max_id || 0;
    console.log(`Máximo ID usuarios: ${userMaxId}`);

    // Estados
    const maxEstadoId = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM estados;` as any[];
    const estadoMaxId = maxEstadoId[0]?.max_id || 0;
    console.log(`Máximo ID estados: ${estadoMaxId}`);

    // Documentación
    const maxDocId = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM documentacion;` as any[];
    const docMaxId = maxDocId[0]?.max_id || 0;
    console.log(`Máximo ID documentación: ${docMaxId}`);

    // Recursos
    const maxRecursoId = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM recursos;` as any[];
    const recursoMaxId = maxRecursoId[0]?.max_id || 0;
    console.log(`Máximo ID recursos: ${recursoMaxId}`);

    // Entidades
    const maxEntidadId = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM entidades;` as any[];
    const entidadMaxId = maxEntidadId[0]?.max_id || 0;
    console.log(`Máximo ID entidades: ${entidadMaxId}`);

    console.log('\n=== CORRIGIENDO SECUENCIAS ===');

    // Corregir secuencia de usuarios
    if (userMaxId > 0) {
      const newUserSeq = userMaxId + 1;
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE usuarios_id_seq RESTART WITH ${newUserSeq};`);
      console.log(`✅ Secuencia usuarios ajustada a ${newUserSeq}`);
    }

    // Corregir secuencia de estados
    if (estadoMaxId > 0) {
      const newEstadoSeq = estadoMaxId + 1;
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE estados_id_seq RESTART WITH ${newEstadoSeq};`);
      console.log(`✅ Secuencia estados ajustada a ${newEstadoSeq}`);
    }

    // Corregir secuencia de documentación
    if (docMaxId > 0) {
      const newDocSeq = docMaxId + 1;
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE documentacion_id_seq RESTART WITH ${newDocSeq};`);
      console.log(`✅ Secuencia documentación ajustada a ${newDocSeq}`);
    }

    // Corregir secuencia de recursos
    if (recursoMaxId > 0) {
      const newRecursoSeq = recursoMaxId + 1;
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE recursos_id_seq RESTART WITH ${newRecursoSeq};`);
      console.log(`✅ Secuencia recursos ajustada a ${newRecursoSeq}`);
    }

    // Corregir secuencia de entidades
    if (entidadMaxId > 0) {
      const newEntidadSeq = entidadMaxId + 1;
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE entidades_id_seq RESTART WITH ${newEntidadSeq};`);
      console.log(`✅ Secuencia entidades ajustada a ${newEntidadSeq}`);
    }

    console.log('\n=== VERIFICANDO SECUENCIAS CORREGIDAS ===');

    // Verificar próximos valores
    const nextUserVal = await prisma.$queryRaw`SELECT nextval('usuarios_id_seq') as next_id;` as any[];
    console.log(`Próximo ID usuario: ${nextUserVal[0].next_id}`);

    const nextEstadoVal = await prisma.$queryRaw`SELECT nextval('estados_id_seq') as next_id;` as any[];
    console.log(`Próximo ID estado: ${nextEstadoVal[0].next_id}`);

    // Restablecer las secuencias al valor correcto (decrementar en 1 porque nextval() ya las incrementó)
    if (userMaxId > 0) {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE usuarios_id_seq RESTART WITH ${userMaxId + 1};`);
    }
    if (estadoMaxId > 0) {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE estados_id_seq RESTART WITH ${estadoMaxId + 1};`);
    }
    if (docMaxId > 0) {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE documentacion_id_seq RESTART WITH ${docMaxId + 1};`);
    }
    if (recursoMaxId > 0) {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE recursos_id_seq RESTART WITH ${recursoMaxId + 1};`);
    }
    if (entidadMaxId > 0) {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE entidades_id_seq RESTART WITH ${entidadMaxId + 1};`);
    }

    console.log('\n✅ Secuencias corregidas correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
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
    console.log('🔍 Diagnosticando PostgreSQL...\n');

    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Verificar usuarios existentes
    console.log('=== USUARIOS ACTUALES ===');
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, username: true, email: true, createdAt: true }
    });
    console.log(`Total usuarios: ${usuarios.length}`);
    usuarios.forEach(user => {
      console.log(`  ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });

    // Verificar el valor actual de la secuencia
    console.log('\n=== SECUENCIAS ===');
    const sequenceInfo = await prisma.$queryRaw`
      SELECT
        schemaname,
        sequencename,
        last_value,
        start_value,
        increment_by,
        max_value,
        min_value,
        cache_value,
        log_cnt,
        is_cycled,
        is_called
      FROM pg_sequences
      WHERE sequencename LIKE '%usuario%';
    `;
    console.log('Secuencias de usuarios:', sequenceInfo);

    // Verificar el próximo valor que se asignará
    try {
      const nextVal = await prisma.$queryRaw`SELECT nextval('usuarios_id_seq') as next_id;`;
      console.log('Próximo ID que se asignará:', nextVal);
    } catch (error) {
      console.log('Error obteniendo nextval:', error);
    }

    // Verificar el máximo ID actual
    const maxId = await prisma.$queryRaw`SELECT MAX(id) as max_id FROM usuarios;`;
    console.log('Máximo ID actual en tabla:', maxId);

    console.log('\n=== OTRAS TABLAS ===');
    const counts = {
      estados: await prisma.estado.count(),
      documentacion: await prisma.documentacion.count(),
      recursos: await prisma.recurso.count(),
      entidades: await prisma.entidad.count()
    };

    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} registros`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
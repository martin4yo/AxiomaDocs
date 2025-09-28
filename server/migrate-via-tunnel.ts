import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Script de migración usando túnel SSH
dotenv.config({ path: '.env.production' });

const mysqlConfig = {
  host: 'localhost',  // A través del túnel SSH
  port: 3307,         // Puerto del túnel
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs',
  connectTimeout: 60000
};

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.POSTGRES_PROD_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  let mysqlConnection: mysql.Connection | null = null;

  try {
    console.log('🚀 Iniciando migración con túnel SSH\n');
    console.log('⚠️  ASEGÚRATE de tener el túnel SSH activo:');
    console.log('   ssh -L 3307:localhost:3306 usuario@149.50.148.198\n');

    // Conectar a MySQL a través del túnel
    console.log('🔌 Conectando a MySQL vía túnel SSH...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL\n');

    // Conectar a PostgreSQL
    console.log('🔌 Conectando a PostgreSQL...');
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // LIMPIAR TODO EN POSTGRESQL
    console.log('⚠️  LIMPIANDO todas las tablas en PostgreSQL...');

    // Deshabilitar temporalmente las restricciones de foreign key
    await prisma.$executeRawUnsafe('SET CONSTRAINTS ALL DEFERRED');

    // Limpiar en orden inverso de dependencias
    await prisma.documentoArchivo.deleteMany();
    await prisma.entidadRecurso.deleteMany();
    await prisma.entidadDocumentacion.deleteMany();
    await prisma.recursoDocumentacion.deleteMany();
    await prisma.entidad.deleteMany();
    await prisma.recurso.deleteMany();
    await prisma.documentacion.deleteMany();
    await prisma.estado.deleteMany();
    await prisma.usuario.deleteMany();

    console.log('✅ Tablas limpiadas\n');

    // 1. MIGRAR USUARIOS PRIMERO
    console.log('=== MIGRANDO USUARIOS ===');
    const [userRows] = await mysqlConnection.execute('SELECT * FROM usuarios');
    const users = userRows as any[];
    console.log(`📊 Usuarios encontrados: ${users.length}`);

    for (const user of users) {
      try {
        await prisma.usuario.create({
          data: {
            username: user.username,
            email: user.email,
            password: user.password,
            nombre: user.nombre,
            apellido: user.apellido,
            esAdmin: user.id === 1,
            activo: Boolean(user.activo !== 0),
            createdAt: new Date(user.createdAt || new Date()),
            updatedAt: new Date(user.updatedAt || new Date())
          }
        });
        console.log(`✅ Usuario migrado: ${user.username}`);
      } catch (error: any) {
        console.log(`❌ Error con usuario ${user.username}:`, error.message);
      }
    }

    // 2. MIGRAR ESTADOS
    console.log('\n=== MIGRANDO ESTADOS ===');
    const [stateRows] = await mysqlConnection.execute('SELECT * FROM estados');
    const states = stateRows as any[];
    console.log(`📊 Estados encontrados: ${states.length}`);

    for (const state of states) {
      try {
        const data = {
          nombre: state.nombre,
          descripcion: state.descripcion,
          color: state.color || '#64748b',
          nivel: state.nivel || 1,
          activo: true,
          createdBy: 1,
          updatedBy: 1,
          createdAt: new Date(state.createdAt || new Date()),
          updatedAt: new Date(state.updatedAt || new Date())
        };

        await prisma.estado.create({ data });
        console.log(`✅ Estado migrado: ${state.nombre}`);
      } catch (error: any) {
        console.log(`❌ Error con estado ${state.nombre}:`, error.message);
      }
    }

    // Obtener el primer estado válido para usar como default
    const defaultState = await prisma.estado.findFirst();
    const defaultStateId = defaultState?.id || 1;

    // 3. MIGRAR DOCUMENTACIÓN
    console.log('\n=== MIGRANDO DOCUMENTACIÓN ===');
    const [docRows] = await mysqlConnection.execute('SELECT * FROM documentacion');
    const docs = docRows as any[];
    console.log(`📊 Documentación encontrada: ${docs.length}`);

    for (const doc of docs) {
      try {
        const data = {
          codigo: doc.codigo,
          nombre: doc.nombre || doc.descripcion || `DOC-${doc.codigo}`,
          descripcion: doc.descripcion,
          diasVigencia: doc.diasVigencia || 365,
          diasAnticipacion: doc.diasAnticipacion || 30,
          esUniversal: Boolean(doc.esObligatorio || doc.esUniversal),
          fechaEmision: doc.fechaEmision ? new Date(doc.fechaEmision) : null,
          fechaTramitacion: doc.fechaTramitacion ? new Date(doc.fechaTramitacion) : null,
          fechaVencimiento: doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : null,
          estadoId: doc.estadoId || defaultStateId,
          activo: true,
          createdBy: 1,
          updatedBy: 1,
          createdAt: new Date(doc.createdAt || new Date()),
          updatedAt: new Date(doc.updatedAt || new Date())
        };

        await prisma.documentacion.create({ data });
        console.log(`✅ Documento migrado: ${doc.codigo}`);
      } catch (error: any) {
        console.log(`❌ Error con documento ${doc.codigo}:`, error.message);
      }
    }

    // 4. MIGRAR RECURSOS
    console.log('\n=== MIGRANDO RECURSOS ===');
    const [resourceRows] = await mysqlConnection.execute('SELECT * FROM recursos');
    const resources = resourceRows as any[];
    console.log(`📊 Recursos encontrados: ${resources.length}`);

    for (const resource of resources) {
      try {
        const data = {
          codigo: resource.codigo,
          nombre: resource.nombre,
          apellido: resource.apellido,
          dni: resource.cuil || resource.dni || null,
          email: null,
          telefono: resource.telefono,
          direccion: resource.direccion,
          fechaNacimiento: null,
          fechaIngreso: resource.fechaAlta ? new Date(resource.fechaAlta) : null,
          fechaBaja: resource.fechaBaja ? new Date(resource.fechaBaja) : null,
          observaciones: null,
          estadoId: defaultStateId,
          activo: true,
          createdBy: 1,
          updatedBy: 1,
          createdAt: new Date(resource.createdAt || new Date()),
          updatedAt: new Date(resource.updatedAt || new Date())
        };

        await prisma.recurso.create({ data });
        console.log(`✅ Recurso migrado: ${resource.nombre} ${resource.apellido}`);
      } catch (error: any) {
        console.log(`❌ Error con recurso ${resource.codigo}:`, error.message);
      }
    }

    // 5. MIGRAR ENTIDADES
    console.log('\n=== MIGRANDO ENTIDADES ===');
    const [entityRows] = await mysqlConnection.execute('SELECT * FROM entidades');
    const entities = entityRows as any[];
    console.log(`📊 Entidades encontradas: ${entities.length}`);

    for (const entity of entities) {
      try {
        const data = {
          nombre: entity.razonSocial || entity.nombre || 'SIN NOMBRE',
          descripcion: null,
          url: entity.urlPlataformaDocumentacion || null,
          contacto: null,
          email: entity.email,
          telefono: entity.telefono,
          direccion: entity.domicilio,
          fechaIngreso: null,
          observaciones: null,
          estadoId: defaultStateId,
          activo: true,
          createdBy: 1,
          updatedBy: 1,
          createdAt: new Date(entity.createdAt || new Date()),
          updatedAt: new Date(entity.updatedAt || new Date())
        };

        await prisma.entidad.create({ data });
        console.log(`✅ Entidad migrada: ${entity.razonSocial || entity.nombre}`);
      } catch (error: any) {
        console.log(`❌ Error con entidad:`, error.message);
      }
    }

    // Habilitar nuevamente las restricciones
    await prisma.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE');

    // RESUMEN FINAL
    console.log('\n📊 === RESUMEN FINAL ===');
    const counts = {
      usuarios: await prisma.usuario.count(),
      estados: await prisma.estado.count(),
      documentacion: await prisma.documentacion.count(),
      recursos: await prisma.recurso.count(),
      entidades: await prisma.entidad.count()
    };

    console.log('Registros migrados:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} registros`);
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`\n✅ Total migrado: ${total} registros`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
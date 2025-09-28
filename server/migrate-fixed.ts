import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Script de migración CORREGIDO - maneja foreign keys correctamente
dotenv.config({ path: '.env.production' });

const mysqlConfig = {
  host: '149.50.148.198',
  port: 3306,
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
    console.log('🚀 Iniciando migración CORREGIDA\n');

    // Conectar a MySQL
    console.log('🔌 Conectando a MySQL de producción...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL\n');

    // Conectar a PostgreSQL
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // LIMPIAR TODO EN POSTGRESQL
    console.log('⚠️  LIMPIANDO todas las tablas en PostgreSQL...');
    await prisma.$executeRawUnsafe('SET session_replication_role = replica');

    await prisma.documentoArchivo.deleteMany();
    await prisma.entidadRecurso.deleteMany();
    await prisma.entidadDocumentacion.deleteMany();
    await prisma.recursoDocumentacion.deleteMany();
    await prisma.entidad.deleteMany();
    await prisma.recurso.deleteMany();
    await prisma.documentacion.deleteMany();
    await prisma.estado.deleteMany();
    await prisma.usuario.deleteMany();

    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT');
    console.log('✅ Tablas limpiadas\n');

    // 1. MIGRAR USUARIOS PRIMERO
    console.log('=== MIGRANDO USUARIOS ===');
    const [userRows] = await mysqlConnection.execute('SELECT * FROM usuarios ORDER BY id');
    const users = userRows as any[];
    console.log(`📊 Usuarios encontrados: ${users.length}`);

    const userMap = new Map<number, number>(); // MySQL ID -> PostgreSQL ID

    for (const user of users) {
      try {
        const createdUser = await prisma.usuario.create({
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
        userMap.set(user.id, createdUser.id);
        console.log(`✅ Usuario migrado: ${user.username} (${user.id} -> ${createdUser.id})`);
      } catch (error: any) {
        console.log(`❌ Error con usuario ${user.username}:`, error.message);
      }
    }

    // Obtener el primer usuario válido para usar como default
    const defaultUserId = Array.from(userMap.values())[0] || 1;
    console.log(`Usuario por defecto: ${defaultUserId}\n`);

    // 2. MIGRAR ESTADOS (Sin referencias a createdBy/updatedBy por ahora)
    console.log('=== MIGRANDO ESTADOS ===');
    const [stateRows] = await mysqlConnection.execute('SELECT * FROM estados ORDER BY id');
    const states = stateRows as any[];
    console.log(`📊 Estados encontrados: ${states.length}`);

    const stateMap = new Map<number, number>(); // MySQL ID -> PostgreSQL ID

    for (const state of states) {
      try {
        const createdState = await prisma.estado.create({
          data: {
            nombre: state.nombre,
            descripcion: state.descripcion,
            color: state.color || '#64748b',
            nivel: state.nivel || 1,
            activo: true,
            createdBy: defaultUserId,
            updatedBy: defaultUserId,
            createdAt: new Date(state.createdAt || new Date()),
            updatedAt: new Date(state.updatedAt || new Date())
          }
        });
        stateMap.set(state.id, createdState.id);
        console.log(`✅ Estado migrado: ${state.nombre} (${state.id} -> ${createdState.id})`);
      } catch (error: any) {
        console.log(`❌ Error con estado ${state.nombre}:`, error.message);
      }
    }

    // Obtener el primer estado válido para usar como default
    const defaultStateId = Array.from(stateMap.values())[0] || 1;
    console.log(`Estado por defecto: ${defaultStateId}\n`);

    // 3. MIGRAR DOCUMENTACIÓN
    console.log('=== MIGRANDO DOCUMENTACIÓN ===');
    const [docRows] = await mysqlConnection.execute('SELECT * FROM documentacion ORDER BY id');
    const docs = docRows as any[];
    console.log(`📊 Documentación encontrada: ${docs.length}`);

    const docMap = new Map<number, number>(); // MySQL ID -> PostgreSQL ID

    for (const doc of docs) {
      try {
        // Mapear el estadoId usando stateMap o usar default
        let estadoId = defaultStateId;
        if (doc.estadoId && stateMap.has(doc.estadoId)) {
          estadoId = stateMap.get(doc.estadoId)!;
        } else if (doc.estadoVencimientoId && stateMap.has(doc.estadoVencimientoId)) {
          estadoId = stateMap.get(doc.estadoVencimientoId)!;
        }

        const createdDoc = await prisma.documentacion.create({
          data: {
            codigo: doc.codigo,
            nombre: doc.nombre || doc.descripcion || `DOC-${doc.codigo}`,
            descripcion: doc.descripcion,
            diasVigencia: doc.diasVigencia || 365,
            diasAnticipacion: doc.diasAnticipacion || 30,
            esUniversal: Boolean(doc.esObligatorio || doc.esUniversal),
            fechaEmision: doc.fechaEmision ? new Date(doc.fechaEmision) : null,
            fechaTramitacion: doc.fechaTramitacion ? new Date(doc.fechaTramitacion) : null,
            fechaVencimiento: doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : null,
            estadoId: estadoId,
            activo: true,
            createdBy: defaultUserId,
            updatedBy: defaultUserId,
            createdAt: new Date(doc.createdAt || new Date()),
            updatedAt: new Date(doc.updatedAt || new Date())
          }
        });
        docMap.set(doc.id, createdDoc.id);
        console.log(`✅ Documento migrado: ${doc.codigo} (${doc.id} -> ${createdDoc.id})`);
      } catch (error: any) {
        console.log(`❌ Error con documento ${doc.codigo}:`, error.message);
      }
    }

    // 4. MIGRAR RECURSOS
    console.log('\n=== MIGRANDO RECURSOS ===');
    const [resourceRows] = await mysqlConnection.execute('SELECT * FROM recursos ORDER BY id');
    const resources = resourceRows as any[];
    console.log(`📊 Recursos encontrados: ${resources.length}`);

    const resourceMap = new Map<number, number>(); // MySQL ID -> PostgreSQL ID

    for (const resource of resources) {
      try {
        const createdResource = await prisma.recurso.create({
          data: {
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
            createdBy: defaultUserId,
            updatedBy: defaultUserId,
            createdAt: new Date(resource.createdAt || new Date()),
            updatedAt: new Date(resource.updatedAt || new Date())
          }
        });
        resourceMap.set(resource.id, createdResource.id);
        console.log(`✅ Recurso migrado: ${resource.nombre} ${resource.apellido} (${resource.id} -> ${createdResource.id})`);
      } catch (error: any) {
        console.log(`❌ Error con recurso ${resource.codigo}:`, error.message);
      }
    }

    // 5. MIGRAR ENTIDADES
    console.log('\n=== MIGRANDO ENTIDADES ===');
    const [entityRows] = await mysqlConnection.execute('SELECT * FROM entidades ORDER BY id');
    const entities = entityRows as any[];
    console.log(`📊 Entidades encontradas: ${entities.length}`);

    const entityMap = new Map<number, number>(); // MySQL ID -> PostgreSQL ID

    for (const entity of entities) {
      try {
        const createdEntity = await prisma.entidad.create({
          data: {
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
            createdBy: defaultUserId,
            updatedBy: defaultUserId,
            createdAt: new Date(entity.createdAt || new Date()),
            updatedAt: new Date(entity.updatedAt || new Date())
          }
        });
        entityMap.set(entity.id, createdEntity.id);
        console.log(`✅ Entidad migrada: ${entity.razonSocial || entity.nombre} (${entity.id} -> ${createdEntity.id})`);
      } catch (error: any) {
        console.log(`❌ Error con entidad:`, error.message);
      }
    }

    // 6. MIGRAR RELACIONES (si existen)
    console.log('\n=== VERIFICANDO RELACIONES ===');

    // Buscar tablas de relaciones en MySQL
    const [tables] = await mysqlConnection.execute('SHOW TABLES');
    const tableNames = (tables as any[]).map(t => Object.values(t)[0]);

    console.log('Tablas en MySQL:', tableNames);

    // Migrar RecursoDocumentacion si existe
    if (tableNames.includes('recurso_documentacion')) {
      console.log('\n--- MIGRANDO RECURSO-DOCUMENTACION ---');
      const [rdRows] = await mysqlConnection.execute('SELECT * FROM recurso_documentacion');
      const resourceDocs = rdRows as any[];
      console.log(`📊 Relaciones recurso-documento: ${resourceDocs.length}`);

      for (const rd of resourceDocs) {
        if (resourceMap.has(rd.recursoId) && docMap.has(rd.documentacionId)) {
          try {
            await prisma.recursoDocumentacion.create({
              data: {
                recursoId: resourceMap.get(rd.recursoId)!,
                documentacionId: docMap.get(rd.documentacionId)!,
                fechaEmision: rd.fechaEmision ? new Date(rd.fechaEmision) : null,
                fechaTramitacion: rd.fechaTramitacion ? new Date(rd.fechaTramitacion) : null,
                fechaVencimiento: rd.fechaVencimiento ? new Date(rd.fechaVencimiento) : null,
                estadoId: defaultStateId,
                observaciones: rd.observaciones,
                activo: true,
                createdBy: defaultUserId,
                updatedBy: defaultUserId
              }
            });
            console.log(`✅ Relación R-D migrada`);
          } catch (error: any) {
            console.log(`❌ Error en relación R-D:`, error.message);
          }
        }
      }
    }

    // RESUMEN FINAL
    console.log('\n📊 === RESUMEN FINAL ===');
    const counts = {
      usuarios: await prisma.usuario.count(),
      estados: await prisma.estado.count(),
      documentacion: await prisma.documentacion.count(),
      recursos: await prisma.recurso.count(),
      entidades: await prisma.entidad.count(),
      recursoDocumentacion: await prisma.recursoDocumentacion.count()
    };

    console.log('Registros migrados:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} registros`);
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`\n✅ Total migrado: ${total} registros`);

    console.log('\n🗺️  MAPEO DE IDs:');
    console.log(`   Usuarios: ${userMap.size} mapeados`);
    console.log(`   Estados: ${stateMap.size} mapeados`);
    console.log(`   Documentos: ${docMap.size} mapeados`);
    console.log(`   Recursos: ${resourceMap.size} mapeados`);
    console.log(`   Entidades: ${entityMap.size} mapeados`);

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
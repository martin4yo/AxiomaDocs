import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Script para migrar datos de MySQL a PostgreSQL EN SERVIDORES DE PRODUCCIÓN
dotenv.config();

// Configuración de MySQL en PRODUCCIÓN (149.50.148.198)
const mysqlConfig = {
  host: '149.50.148.198',
  port: 3306,
  user: 'root', // Ajustar según tu usuario MySQL de producción
  password: process.env.MYSQL_PROD_PASSWORD || '', // Usar variable de entorno por seguridad
  database: 'axiomadocs',
  connectTimeout: 60000
};

// Configuración de PostgreSQL en PRODUCCIÓN
// IMPORTANTE: Actualizar con las credenciales correctas del servidor PostgreSQL de producción
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_PROD_URL || 'postgresql://usuario:password@host:puerto/database'
    }
  }
});

interface MySQLRow {
  [key: string]: any;
}

async function connectMySQL() {
  try {
    console.log('🔌 Conectando a MySQL de PRODUCCIÓN (149.50.148.198)...');
    const connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL de producción');
    return connection;
  } catch (error) {
    console.error('❌ Error conectando a MySQL de producción:', error);
    console.log('💡 Verifica:');
    console.log('   - Que MySQL permita conexiones remotas');
    console.log('   - Que el usuario tenga permisos desde tu IP');
    console.log('   - Que el firewall permita puerto 3306');
    throw error;
  }
}

async function testPostgreSQLConnection() {
  try {
    console.log('🔌 Probando conexión a PostgreSQL de PRODUCCIÓN...');
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL de producción');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL de producción:', error);
    console.log('💡 Verifica la URL de conexión en POSTGRES_PROD_URL');
    return false;
  }
}

async function migrateTable(
  mysqlConnection: mysql.Connection,
  tableName: string,
  prismaModel: any,
  transformData?: (row: MySQLRow) => any
) {
  try {
    console.log(`\n🔄 Migrando tabla: ${tableName}`);

    // Obtener datos de MySQL
    const [rows] = await mysqlConnection.execute(`SELECT * FROM ${tableName}`);
    const data = rows as MySQLRow[];

    console.log(`📊 Encontrados ${data.length} registros en ${tableName}`);

    if (data.length === 0) {
      console.log(`⚠️  Tabla ${tableName} está vacía, saltando...`);
      return;
    }

    // Transformar datos si es necesario
    const transformedData = transformData ? data.map(transformData) : data;

    // Insertar en PostgreSQL usando Prisma
    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of transformedData) {
      try {
        // Eliminar campos auto-incrementales si existen
        const { id, ...dataWithoutId } = row;

        await prismaModel.create({
          data: dataWithoutId
        });
        insertedCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          skippedCount++;
          console.log(`⚠️  Registro duplicado en ${tableName}, saltando...`);
        } else if (error.code === 'P2003') {
          skippedCount++;
          console.log(`⚠️  Foreign key inválida en ${tableName}, saltando registro...`);
        } else {
          console.error(`❌ Error insertando en ${tableName}:`, error.message);
          skippedCount++;
        }
      }
    }

    console.log(`✅ Migración de ${tableName} completada: ${insertedCount} insertados, ${skippedCount} saltados`);

  } catch (error) {
    console.error(`❌ Error migrando tabla ${tableName}:`, error);
  }
}

async function resetSequences() {
  try {
    console.log('\n🔄 Reiniciando secuencias de PostgreSQL...');

    const tables = [
      'usuarios', 'estados', 'documentacion', 'recursos',
      'entidades', 'recurso_documentacion', 'entidad_documentacion',
      'entidad_recurso'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`
          SELECT setval(pg_get_serial_sequence('${table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM ${table}), 1), false);
        `);
      } catch (error) {
        // Algunas tablas pueden no tener secuencias, ignorar errores
      }
    }

    console.log('✅ Secuencias reiniciadas');
  } catch (error) {
    console.error('❌ Error reiniciando secuencias:', error);
  }
}

async function main() {
  let mysqlConnection: mysql.Connection | null = null;

  try {
    console.log('🚀 Iniciando migración MySQL (Producción) → PostgreSQL (Producción)');
    console.log('📍 MySQL: 149.50.148.198:3306');
    console.log('📍 PostgreSQL: Ver POSTGRES_PROD_URL en .env');
    console.log('');

    // Verificar variables de entorno
    if (!process.env.MYSQL_PROD_PASSWORD) {
      console.error('❌ Falta MYSQL_PROD_PASSWORD en el archivo .env');
      console.log('Agrega al archivo .env:');
      console.log('MYSQL_PROD_PASSWORD=tu_password_mysql');
      process.exit(1);
    }

    if (!process.env.POSTGRES_PROD_URL) {
      console.error('❌ Falta POSTGRES_PROD_URL en el archivo .env');
      console.log('Agrega al archivo .env:');
      console.log('POSTGRES_PROD_URL=postgresql://usuario:password@host:puerto/database');
      process.exit(1);
    }

    // Conectar a MySQL de producción
    mysqlConnection = await connectMySQL();

    // Verificar conexión PostgreSQL de producción
    const pgConnected = await testPostgreSQLConnection();
    if (!pgConnected) {
      process.exit(1);
    }

    // IMPORTANTE: Preguntar antes de limpiar PostgreSQL
    console.log('\n⚠️  ADVERTENCIA: Esto limpiará todas las tablas en PostgreSQL de producción');
    console.log('Si deseas continuar, descomenta las siguientes líneas en el script:\n');

    // DESCOMENTA ESTAS LÍNEAS PARA LIMPIAR Y MIGRAR
    /*
    // Limpiar tablas en PostgreSQL de producción
    console.log('🧹 Limpiando tablas en PostgreSQL de producción...');
    await prisma.entidadRecurso.deleteMany();
    await prisma.entidadDocumentacion.deleteMany();
    await prisma.recursoDocumentacion.deleteMany();
    await prisma.entidad.deleteMany();
    await prisma.recurso.deleteMany();
    await prisma.documentacion.deleteMany();
    await prisma.estado.deleteMany();
    await prisma.usuario.deleteMany();
    console.log('✅ Tablas limpiadas');
    */

    // Migrar tablas en orden (respetando dependencias)

    // 1. Usuarios
    await migrateTable(mysqlConnection, 'usuarios', prisma.usuario, (row) => ({
      username: row.username,
      email: row.email,
      password: row.password,
      nombre: row.nombre,
      apellido: row.apellido,
      esAdmin: row.id === 1 ? true : false, // Primer usuario es admin
      activo: Boolean(row.activo || true),
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 2. Estados
    await migrateTable(mysqlConnection, 'estados', prisma.estado, (row) => ({
      nombre: row.nombre,
      descripcion: row.descripcion,
      color: row.color || '#64748b',
      nivel: row.nivel || 1,
      activo: true,
      createdBy: row.creadoPor || row.createdBy || 1,
      updatedBy: row.modificadoPor || row.updatedBy || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 3. Documentación
    await migrateTable(mysqlConnection, 'documentacion', prisma.documentacion, (row) => ({
      codigo: row.codigo,
      nombre: row.nombre || row.descripcion, // Usar descripcion si no hay nombre
      descripcion: row.descripcion,
      diasVigencia: row.diasVigencia || row.dias_vigencia || 365,
      diasAnticipacion: row.diasAnticipacion || row.dias_anticipacion || 30,
      esUniversal: Boolean(row.esUniversal || row.es_universal),
      fechaEmision: row.fechaEmision || row.fecha_emision ? new Date(row.fechaEmision || row.fecha_emision) : null,
      fechaTramitacion: row.fechaTramitacion || row.fecha_tramitacion ? new Date(row.fechaTramitacion || row.fecha_tramitacion) : null,
      fechaVencimiento: row.fechaVencimiento || row.fecha_vencimiento ? new Date(row.fechaVencimiento || row.fecha_vencimiento) : null,
      estadoId: row.estadoId || row.estado_id || row.estadoVencimientoId || 1,
      activo: Boolean(row.activo !== undefined ? row.activo : true),
      createdBy: row.createdBy || row.creadoPor || 1,
      updatedBy: row.updatedBy || row.modificadoPor || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 4. Recursos
    await migrateTable(mysqlConnection, 'recursos', prisma.recurso, (row) => ({
      codigo: row.codigo,
      nombre: row.nombre,
      apellido: row.apellido,
      dni: row.dni || row.cuil || null,
      email: row.email || null,
      telefono: row.telefono,
      direccion: row.direccion || row.domicilio,
      fechaNacimiento: row.fechaNacimiento || row.fecha_nacimiento ? new Date(row.fechaNacimiento || row.fecha_nacimiento) : null,
      fechaIngreso: row.fechaIngreso || row.fechaAlta || row.fecha_alta ? new Date(row.fechaIngreso || row.fechaAlta || row.fecha_alta) : null,
      fechaBaja: row.fechaBaja || row.fecha_baja ? new Date(row.fechaBaja || row.fecha_baja) : null,
      observaciones: row.observaciones || null,
      estadoId: row.estadoId || row.estado_id || 1,
      activo: Boolean(row.activo !== undefined ? row.activo : true),
      createdBy: row.createdBy || row.creadoPor || 1,
      updatedBy: row.updatedBy || row.modificadoPor || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 5. Entidades
    await migrateTable(mysqlConnection, 'entidades', prisma.entidad, (row) => ({
      nombre: row.nombre || row.razonSocial || row.razon_social,
      descripcion: row.descripcion || null,
      url: row.url || row.urlPlataformaDocumentacion || row.url_plataforma_documentacion || null,
      contacto: row.contacto || null,
      email: row.email || null,
      telefono: row.telefono,
      direccion: row.direccion || row.domicilio,
      fechaIngreso: row.fechaIngreso || row.fecha_ingreso ? new Date(row.fechaIngreso || row.fecha_ingreso) : null,
      observaciones: row.observaciones || null,
      estadoId: row.estadoId || row.estado_id || 1,
      activo: Boolean(row.activo !== undefined ? row.activo : true),
      createdBy: row.createdBy || row.creadoPor || 1,
      updatedBy: row.updatedBy || row.modificadoPor || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 6. RecursoDocumentacion
    await migrateTable(mysqlConnection, 'recurso_documentacion', prisma.recursoDocumentacion, (row) => ({
      recursoId: row.recursoId || row.recurso_id,
      documentacionId: row.documentacionId || row.documentacion_id,
      fechaEmision: row.fechaEmision || row.fecha_emision ? new Date(row.fechaEmision || row.fecha_emision) : null,
      fechaTramitacion: row.fechaTramitacion || row.fecha_tramitacion ? new Date(row.fechaTramitacion || row.fecha_tramitacion) : null,
      fechaVencimiento: row.fechaVencimiento || row.fecha_vencimiento ? new Date(row.fechaVencimiento || row.fecha_vencimiento) : null,
      observaciones: row.observaciones || null,
      estadoId: row.estadoId || row.estado_id || 1,
      activo: Boolean(row.activo !== undefined ? row.activo : true),
      createdBy: row.createdBy || row.creadoPor || 1,
      updatedBy: row.updatedBy || row.modificadoPor || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 7. EntidadDocumentacion
    await migrateTable(mysqlConnection, 'entidad_documentacion', prisma.entidadDocumentacion, (row) => ({
      entidadId: row.entidadId || row.entidad_id,
      documentacionId: row.documentacionId || row.documentacion_id,
      esInhabilitante: Boolean(row.esInhabilitante || row.es_inhabilitante),
      notificarEmail: Boolean(row.notificarEmail || row.notificar_email || row.enviarPorMail || row.enviar_por_mail),
      fechaEmision: row.fechaEmision || row.fecha_emision ? new Date(row.fechaEmision || row.fecha_emision) : null,
      fechaTramitacion: row.fechaTramitacion || row.fecha_tramitacion ? new Date(row.fechaTramitacion || row.fecha_tramitacion) : null,
      fechaVencimiento: row.fechaVencimiento || row.fecha_vencimiento ? new Date(row.fechaVencimiento || row.fecha_vencimiento) : null,
      observaciones: row.observaciones || null,
      estadoId: row.estadoId || row.estado_id || 1,
      activo: Boolean(row.activo !== undefined ? row.activo : true),
      createdBy: row.createdBy || row.creadoPor || 1,
      updatedBy: row.updatedBy || row.modificadoPor || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // 8. EntidadRecurso
    await migrateTable(mysqlConnection, 'entidad_recurso', prisma.entidadRecurso, (row) => ({
      entidadId: row.entidadId || row.entidad_id,
      recursoId: row.recursoId || row.recurso_id,
      fechaInicio: row.fechaInicio || row.fecha_inicio ? new Date(row.fechaInicio || row.fecha_inicio) : null,
      fechaFin: row.fechaFin || row.fecha_fin ? new Date(row.fechaFin || row.fecha_fin) : null,
      observaciones: row.observaciones || null,
      activo: Boolean(row.activo !== undefined ? row.activo : true),
      createdBy: row.createdBy || row.creadoPor || 1,
      updatedBy: row.updatedBy || row.modificadoPor || 1,
      createdAt: new Date(row.createdAt || row.created_at || new Date()),
      updatedAt: new Date(row.updatedAt || row.updated_at || new Date())
    }));

    // Reiniciar secuencias
    await resetSequences();

    console.log('\n🎉 ¡Migración de producción completada exitosamente!');

    // Mostrar resumen
    console.log('\n📊 === RESUMEN DE MIGRACIÓN ===');
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

    console.log('📋 Registros migrados por tabla:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} registros`);
    });

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`\n✅ Total de registros migrados: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    // Cerrar conexiones
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('📪 Conexión MySQL cerrada');
    }
    await prisma.$disconnect();
    console.log('📪 Conexión PostgreSQL cerrada');
  }
}

// Ejecutar migración
main().catch(console.error);
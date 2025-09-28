import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// Script para migrar datos de MySQL a PostgreSQL
const prisma = new PrismaClient();

// Configuración de MySQL - AJUSTAR SEGÚN TU CONFIGURACIÓN
const mysqlConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root', // Ajustar según tu usuario MySQL
  password: 'Q27G4B98', // Ajustar según tu contraseña MySQL
  database: 'axiomadocs'
};

interface MySQLRow {
  [key: string]: any;
}

async function connectMySQL() {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL');
    return connection;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    throw error;
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
    const transformedData = transformData
      ? data.map(transformData)
      : data;

    // Insertar en PostgreSQL usando Prisma
    for (const row of transformedData) {
      try {
        // Eliminar campos auto-incrementales si existen
        const { id, ...dataWithoutId } = row;

        await prismaModel.create({
          data: dataWithoutId
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Registro duplicado en ${tableName}, saltando...`);
        } else {
          console.error(`❌ Error insertando en ${tableName}:`, error);
        }
      }
    }

    console.log(`✅ Migración de ${tableName} completada`);

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
      'entidad_recurso', 'intercambios', 'workflows',
      'documento_archivos', 'documento_envios', 'documento_eventos',
      'estado_documento_logs'
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
    console.log('🚀 Iniciando migración MySQL → PostgreSQL');

    // Conectar a MySQL
    mysqlConnection = await connectMySQL();

    // Verificar conexión PostgreSQL
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');

    // Migrar tablas en orden (respetando dependencias)

    // 1. Usuarios (independiente)
    await migrateTable(mysqlConnection, 'usuarios', prisma.usuario, (row) => ({
      username: row.username,
      email: row.email,
      password: row.password,
      nombre: row.nombre,
      apellido: row.apellido,
      esAdmin: Boolean(row.es_admin || row.esAdmin),
      activo: Boolean(row.activo),
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 2. Estados (con createdBy)
    await migrateTable(mysqlConnection, 'estados', prisma.estado, (row) => ({
      nombre: row.nombre,
      descripcion: row.descripcion,
      color: row.color || '#64748b',
      nivel: row.nivel || 1,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 3. Documentación
    await migrateTable(mysqlConnection, 'documentacion', prisma.documentacion, (row) => ({
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      diasVigencia: row.dias_vigencia || row.diasVigencia || 365,
      diasAnticipacion: row.dias_anticipacion || row.diasAnticipacion || 30,
      esUniversal: Boolean(row.es_universal || row.esUniversal),
      fechaEmision: row.fecha_emision ? new Date(row.fecha_emision) : null,
      fechaTramitacion: row.fecha_tramitacion ? new Date(row.fecha_tramitacion) : null,
      fechaVencimiento: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : null,
      estadoId: row.estado_id || row.estadoId,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 4. Recursos
    await migrateTable(mysqlConnection, 'recursos', prisma.recurso, (row) => ({
      codigo: row.codigo,
      nombre: row.nombre,
      apellido: row.apellido,
      dni: row.dni,
      email: row.email,
      telefono: row.telefono,
      direccion: row.direccion,
      fechaNacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento) : null,
      fechaIngreso: row.fecha_ingreso ? new Date(row.fecha_ingreso) : null,
      fechaBaja: row.fecha_baja ? new Date(row.fecha_baja) : null,
      observaciones: row.observaciones,
      estadoId: row.estado_id || row.estadoId,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 5. Entidades
    await migrateTable(mysqlConnection, 'entidades', prisma.entidad, (row) => ({
      nombre: row.nombre,
      descripcion: row.descripcion,
      url: row.url,
      contacto: row.contacto,
      email: row.email,
      telefono: row.telefono,
      direccion: row.direccion,
      fechaIngreso: row.fecha_ingreso ? new Date(row.fecha_ingreso) : null,
      observaciones: row.observaciones,
      estadoId: row.estado_id || row.estadoId,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 6. RecursoDocumentacion
    await migrateTable(mysqlConnection, 'recurso_documentacion', prisma.recursoDocumentacion, (row) => ({
      recursoId: row.recurso_id || row.recursoId,
      documentacionId: row.documentacion_id || row.documentacionId,
      fechaEmision: row.fecha_emision ? new Date(row.fecha_emision) : null,
      fechaTramitacion: row.fecha_tramitacion ? new Date(row.fecha_tramitacion) : null,
      fechaVencimiento: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : null,
      observaciones: row.observaciones,
      estadoId: row.estado_id || row.estadoId,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 7. EntidadDocumentacion
    await migrateTable(mysqlConnection, 'entidad_documentacion', prisma.entidadDocumentacion, (row) => ({
      entidadId: row.entidad_id || row.entidadId,
      documentacionId: row.documentacion_id || row.documentacionId,
      esInhabilitante: Boolean(row.es_inhabilitante || row.esInhabilitante),
      notificarEmail: Boolean(row.notificar_email || row.notificarEmail || row.enviar_por_mail),
      fechaEmision: row.fecha_emision ? new Date(row.fecha_emision) : null,
      fechaTramitacion: row.fecha_tramitacion ? new Date(row.fecha_tramitacion) : null,
      fechaVencimiento: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : null,
      observaciones: row.observaciones,
      estadoId: row.estado_id || row.estadoId,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // 8. EntidadRecurso
    await migrateTable(mysqlConnection, 'entidad_recurso', prisma.entidadRecurso, (row) => ({
      entidadId: row.entidad_id || row.entidadId,
      recursoId: row.recurso_id || row.recursoId,
      fechaInicio: row.fecha_inicio ? new Date(row.fecha_inicio) : null,
      fechaFin: row.fecha_fin ? new Date(row.fecha_fin) : null,
      observaciones: row.observaciones,
      activo: Boolean(row.activo),
      createdBy: row.created_by || row.createdBy || 1,
      updatedBy: row.updated_by || row.updatedBy,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt)
    }));

    // Reiniciar secuencias
    await resetSequences();

    console.log('\n🎉 ¡Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    // Cerrar conexiones
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
    await prisma.$disconnect();
  }
}

// Ejecutar migración
main().catch(console.error);
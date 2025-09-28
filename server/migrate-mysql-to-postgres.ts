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

    // Validar foreign keys para tablas que las requieren
    const needsValidation = ['entidad_recurso', 'recurso_documentacion', 'entidad_documentacion'];
    const validatedData = needsValidation.includes(tableName)
      ? await validateForeignKeys(mysqlConnection, tableName, data)
      : data;

    // Transformar datos si es necesario
    const transformedData = transformData
      ? validatedData.map(transformData)
      : validatedData;

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
        } else if (error.code === 'P2003') {
          console.log(`⚠️  Foreign key inválida en ${tableName}, saltando registro...`);
          console.log(`   Datos: ${JSON.stringify(row, null, 2)}`);
        } else {
          console.error(`❌ Error insertando en ${tableName}:`, error);
          console.log(`   Datos problemáticos: ${JSON.stringify(row, null, 2)}`);
        }
      }
    }

    console.log(`✅ Migración de ${tableName} completada`);

  } catch (error) {
    console.error(`❌ Error migrando tabla ${tableName}:`, error);
  }
}

async function validateForeignKeys(
  mysqlConnection: mysql.Connection,
  tableName: string,
  data: MySQLRow[]
): Promise<MySQLRow[]> {
  console.log(`🔍 Validando foreign keys para ${tableName}...`);

  const validData: MySQLRow[] = [];

  for (const row of data) {
    let isValid = true;

    try {
      // Validaciones específicas por tabla
      if (tableName === 'entidad_recurso') {
        // Verificar que existan la entidad y el recurso
        const [entidadExists] = await mysqlConnection.execute(
          'SELECT id FROM entidades WHERE id = ?', [row.entidad_id || row.entidadId]
        );
        const [recursoExists] = await mysqlConnection.execute(
          'SELECT id FROM recursos WHERE id = ?', [row.recurso_id || row.recursoId]
        );

        if ((entidadExists as any[]).length === 0) {
          console.log(`⚠️  Entidad ${row.entidad_id || row.entidadId} no existe, saltando registro`);
          isValid = false;
        }
        if ((recursoExists as any[]).length === 0) {
          console.log(`⚠️  Recurso ${row.recurso_id || row.recursoId} no existe, saltando registro`);
          isValid = false;
        }
      }

      if (tableName === 'recurso_documentacion') {
        // Verificar que existan el recurso y la documentación
        const [recursoExists] = await mysqlConnection.execute(
          'SELECT id FROM recursos WHERE id = ?', [row.recurso_id || row.recursoId]
        );
        const [docExists] = await mysqlConnection.execute(
          'SELECT id FROM documentacion WHERE id = ?', [row.documentacion_id || row.documentacionId]
        );

        if ((recursoExists as any[]).length === 0) {
          console.log(`⚠️  Recurso ${row.recurso_id || row.recursoId} no existe, saltando registro`);
          isValid = false;
        }
        if ((docExists as any[]).length === 0) {
          console.log(`⚠️  Documentación ${row.documentacion_id || row.documentacionId} no existe, saltando registro`);
          isValid = false;
        }
      }

      if (tableName === 'entidad_documentacion') {
        // Verificar que existan la entidad y la documentación
        const [entidadExists] = await mysqlConnection.execute(
          'SELECT id FROM entidades WHERE id = ?', [row.entidad_id || row.entidadId]
        );
        const [docExists] = await mysqlConnection.execute(
          'SELECT id FROM documentacion WHERE id = ?', [row.documentacion_id || row.documentacionId]
        );

        if ((entidadExists as any[]).length === 0) {
          console.log(`⚠️  Entidad ${row.entidad_id || row.entidadId} no existe, saltando registro`);
          isValid = false;
        }
        if ((docExists as any[]).length === 0) {
          console.log(`⚠️  Documentación ${row.documentacion_id || row.documentacionId} no existe, saltando registro`);
          isValid = false;
        }
      }

      if (isValid) {
        validData.push(row);
      }

    } catch (error) {
      console.log(`⚠️  Error validando registro, saltando: ${error}`);
    }
  }

  console.log(`✅ ${validData.length}/${data.length} registros válidos en ${tableName}`);
  return validData;
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
      esAdmin: row.id === 1 ? true : false, // Primer usuario es admin, MySQL no tiene campo esAdmin
      activo: Boolean(row.activo),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 2. Estados (con createdBy)
    await migrateTable(mysqlConnection, 'estados', prisma.estado, (row) => ({
      nombre: row.nombre,
      descripcion: row.descripcion,
      color: row.color || '#64748b',
      nivel: row.nivel || 1,
      activo: true, // MySQL no tiene campo activo para estados
      createdBy: row.creadoPor || 1,
      updatedBy: row.modificadoPor || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 3. Documentación
    await migrateTable(mysqlConnection, 'documentacion', prisma.documentacion, (row) => ({
      codigo: row.codigo,
      nombre: row.nombre, // Ya se agregó este campo en fix-mysql-data.ts
      descripcion: row.descripcion,
      diasVigencia: row.diasVigencia || 365,
      diasAnticipacion: row.diasAnticipacion || 30,
      esUniversal: Boolean(row.esUniversal),
      fechaEmision: row.fechaEmision ? new Date(row.fechaEmision) : null,
      fechaTramitacion: row.fechaTramitacion ? new Date(row.fechaTramitacion) : null,
      fechaVencimiento: row.fechaVencimiento ? new Date(row.fechaVencimiento) : null,
      estadoId: row.estadoId || 1, // Asegurar que siempre tenga un estadoId válido
      activo: Boolean(row.activo),
      createdBy: row.createdBy || 1,
      updatedBy: row.updatedBy || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 4. Recursos
    await migrateTable(mysqlConnection, 'recursos', prisma.recurso, (row) => ({
      codigo: row.codigo,
      nombre: row.nombre,
      apellido: row.apellido,
      dni: row.cuil, // Campo cuil en MySQL → dni en PostgreSQL
      email: null, // No existe en MySQL
      telefono: row.telefono,
      direccion: row.direccion,
      fechaNacimiento: null, // No existe en MySQL
      fechaIngreso: row.fechaAlta ? new Date(row.fechaAlta) : null,
      fechaBaja: row.fechaBaja ? new Date(row.fechaBaja) : null,
      observaciones: null, // No existe en MySQL
      estadoId: row.estadoId, // Ya se agregó en fix-mysql-data.ts
      activo: Boolean(row.activo),
      createdBy: row.createdBy || 1,
      updatedBy: row.updatedBy || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 5. Entidades
    await migrateTable(mysqlConnection, 'entidades', prisma.entidad, (row) => ({
      nombre: row.nombre, // Ya se agregó en fix-mysql-data.ts
      descripcion: null, // No existe en MySQL, usar razonSocial como descripción si es necesario
      url: row.urlPlataformaDocumentacion || null,
      contacto: null, // No existe en MySQL
      email: row.email,
      telefono: row.telefono,
      direccion: row.domicilio,
      fechaIngreso: null, // No existe en MySQL
      observaciones: null, // No existe en MySQL
      estadoId: row.estadoId, // Ya se agregó en fix-mysql-data.ts
      activo: Boolean(row.activo),
      createdBy: row.createdBy || 1,
      updatedBy: row.updatedBy || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 6. RecursoDocumentacion
    await migrateTable(mysqlConnection, 'recurso_documentacion', prisma.recursoDocumentacion, (row) => ({
      recursoId: row.recursoId,
      documentacionId: row.documentacionId,
      fechaEmision: row.fechaEmision ? new Date(row.fechaEmision) : null,
      fechaTramitacion: row.fechaTramitacion ? new Date(row.fechaTramitacion) : null,
      fechaVencimiento: row.fechaVencimiento ? new Date(row.fechaVencimiento) : null,
      observaciones: row.observaciones,
      estadoId: row.estadoId,
      activo: true, // No existe campo activo en MySQL para esta tabla
      createdBy: row.createdBy || 1,
      updatedBy: row.updatedBy || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 7. EntidadDocumentacion
    await migrateTable(mysqlConnection, 'entidad_documentacion', prisma.entidadDocumentacion, (row) => ({
      entidadId: row.entidadId,
      documentacionId: row.documentacionId,
      esInhabilitante: Boolean(row.esInhabilitante),
      notificarEmail: Boolean(row.enviarPorMail),
      fechaEmision: row.fechaEmision ? new Date(row.fechaEmision) : null,
      fechaTramitacion: row.fechaTramitacion ? new Date(row.fechaTramitacion) : null,
      fechaVencimiento: row.fechaVencimiento ? new Date(row.fechaVencimiento) : null,
      observaciones: null, // No existe en MySQL
      estadoId: row.estadoId,
      activo: true, // No existe campo activo en MySQL para esta tabla
      createdBy: row.createdBy || 1,
      updatedBy: row.updatedBy || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    // 8. EntidadRecurso
    await migrateTable(mysqlConnection, 'entidad_recurso', prisma.entidadRecurso, (row) => ({
      entidadId: row.entidadId,
      recursoId: row.recursoId,
      fechaInicio: row.fechaInicio ? new Date(row.fechaInicio) : null,
      fechaFin: row.fechaFin ? new Date(row.fechaFin) : null,
      observaciones: null, // No existe en MySQL
      activo: Boolean(row.activo),
      createdBy: row.createdBy || 1,
      updatedBy: row.updatedBy || 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
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
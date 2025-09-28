import mysql from 'mysql2/promise';
import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

// Configuración de MySQL
const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs',
  port: 3306
};

async function migrateData() {
  let mysqlConnection;

  try {
    console.log('🔄 Iniciando migración de MySQL a PostgreSQL...\n');

    // Conectar a MySQL
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL');

    // 1. MIGRAR USUARIOS
    console.log('\n📤 Migrando Usuarios...');
    const [usuarios] = await mysqlConnection.execute('SELECT * FROM usuarios');

    for (const user of usuarios as any[]) {
      try {
        await prisma.usuario.create({
          data: {
            id: user.id,
            username: user.username,
            password: user.password,
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            esAdmin: false, // Se ajustará manualmente si es necesario
            activo: Boolean(user.activo !== undefined ? user.activo : true),
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Usuario migrado: ${user.username}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Usuario ya existe: ${user.username}`);
        } else {
          console.error(`  ❌ Error migrando usuario ${user.username}:`, error.message);
        }
      }
    }

    // 2. MIGRAR ESTADOS
    console.log('\n📤 Migrando Estados...');
    const [estados] = await mysqlConnection.execute('SELECT * FROM estados');

    for (const estado of estados as any[]) {
      try {
        await prisma.estado.create({
          data: {
            id: estado.id,
            nombre: estado.nombre,
            descripcion: estado.descripcion,
            color: estado.color || '#808080',
            nivel: estado.nivel || 5,
            activo: Boolean(estado.activo !== undefined ? estado.activo : true),
            createdBy: estado.creadoPor || 1,
            updatedBy: estado.modificadoPor || estado.creadoPor || 1,
            createdAt: estado.createdAt ? new Date(estado.createdAt) : new Date(),
            updatedAt: estado.updatedAt ? new Date(estado.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Estado migrado: ${estado.nombre}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Estado ya existe: ${estado.nombre}`);
        } else {
          console.error(`  ❌ Error migrando estado ${estado.nombre}:`, error.message);
        }
      }
    }

    // 3. MIGRAR RECURSOS
    console.log('\n📤 Migrando Recursos...');
    const [recursos] = await mysqlConnection.execute('SELECT * FROM recursos');

    for (const recurso of recursos as any[]) {
      try {
        await prisma.recurso.create({
          data: {
            id: recurso.id,
            nombre: recurso.nombre,
            apellido: recurso.apellido,
            dni: recurso.cuil || null, // En MySQL es 'cuil', en PostgreSQL 'dni'
            email: null, // No existe en MySQL
            telefono: recurso.telefono,
            direccion: `${recurso.direccion || ''} ${recurso.localidad || ''}`.trim(),
            fechaNacimiento: null, // No existe en MySQL
            fechaIngreso: recurso.fechaAlta ? new Date(recurso.fechaAlta) : null,
            fechaBaja: recurso.fechaBaja ? new Date(recurso.fechaBaja) : null,
            observaciones: null, // No existe en MySQL
            activo: Boolean(recurso.fechaBaja === null),
            estadoId: 2, // Estado VIGENTE por defecto
            createdBy: recurso.creadoPor || 1,
            updatedBy: recurso.modificadoPor || recurso.creadoPor || 1,
            createdAt: recurso.createdAt ? new Date(recurso.createdAt) : new Date(),
            updatedAt: recurso.updatedAt ? new Date(recurso.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Recurso migrado: ${recurso.apellido} ${recurso.nombre}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Recurso ya existe: ${recurso.apellido} ${recurso.nombre}`);
        } else {
          console.error(`  ❌ Error migrando recurso ${recurso.id}:`, error.message);
        }
      }
    }

    // 4. MIGRAR ENTIDADES
    console.log('\n📤 Migrando Entidades...');
    const [entidades] = await mysqlConnection.execute('SELECT * FROM entidades');

    for (const entidad of entidades as any[]) {
      try {
        await prisma.entidad.create({
          data: {
            id: entidad.id,
            nombre: entidad.razonSocial,
            descripcion: entidad.cuit || null, // Guardar CUIT en descripción
            url: entidad.urlPlataformaDocumentacion,
            contacto: null, // No existe en MySQL
            email: entidad.email,
            telefono: entidad.telefono,
            direccion: `${entidad.domicilio || ''} ${entidad.localidad || ''}`.trim(),
            fechaIngreso: null, // No existe en MySQL
            observaciones: null, // No existe en MySQL
            activo: true,
            estadoId: 2, // Estado VIGENTE por defecto
            createdBy: entidad.creadoPor || 1,
            updatedBy: entidad.modificadoPor || entidad.creadoPor || 1,
            createdAt: entidad.createdAt ? new Date(entidad.createdAt) : new Date(),
            updatedAt: entidad.updatedAt ? new Date(entidad.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Entidad migrada: ${entidad.razonSocial}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Entidad ya existe: ${entidad.razonSocial}`);
        } else {
          console.error(`  ❌ Error migrando entidad ${entidad.razonSocial}:`, error.message);
        }
      }
    }

    // 5. MIGRAR DOCUMENTACIÓN
    console.log('\n📤 Migrando Documentación...');
    const [documentacion] = await mysqlConnection.execute('SELECT * FROM documentacion');

    for (const doc of documentacion as any[]) {
      try {
        await prisma.documentacion.create({
          data: {
            id: doc.id,
            nombre: doc.descripcion, // En MySQL es 'descripcion', en PostgreSQL 'nombre'
            descripcion: doc.descripcion,
            diasVigencia: doc.diasVigencia || 365,
            diasAnticipacion: doc.diasAnticipacion || 30,
            esUniversal: Boolean(doc.esUniversal),
            fechaEmision: doc.fechaEmision ? new Date(doc.fechaEmision) : null,
            fechaTramitacion: doc.fechaTramitacion ? new Date(doc.fechaTramitacion) : null,
            fechaVencimiento: doc.fechaVencimiento ? new Date(doc.fechaVencimiento) : null,
            activo: true,
            estadoId: doc.estadoVencimientoId || doc.estadoId || 2,
            createdBy: doc.creadoPor || 1,
            updatedBy: doc.modificadoPor || doc.creadoPor || 1,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Documentación migrada: ${doc.descripcion}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Documentación ya existe: ${doc.descripcion}`);
        } else {
          console.error(`  ❌ Error migrando documentación ${doc.descripcion}:`, error.message);
        }
      }
    }

    // 6. MIGRAR RECURSO_DOCUMENTACION
    console.log('\n📤 Migrando Recurso-Documentación...');
    const [recursoDoc] = await mysqlConnection.execute('SELECT * FROM recurso_documentacion');

    for (const rd of recursoDoc as any[]) {
      try {
        await prisma.recursoDocumentacion.create({
          data: {
            id: rd.id,
            recursoId: rd.recursoId,
            documentacionId: rd.documentacionId,
            fechaEmision: rd.fechaEmision ? new Date(rd.fechaEmision) : null,
            fechaTramitacion: rd.fechaTramitacion ? new Date(rd.fechaTramitacion) : null,
            fechaVencimiento: rd.fechaVencimiento ? new Date(rd.fechaVencimiento) : null,
            observaciones: rd.observaciones,
            estadoId: rd.estadoId,
            activo: Boolean(rd.activo !== undefined ? rd.activo : true),
            createdBy: rd.createdBy || 1,
            updatedBy: rd.updatedBy || rd.createdBy || 1,
            createdAt: rd.createdAt ? new Date(rd.createdAt) : new Date(),
            updatedAt: rd.updatedAt ? new Date(rd.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Recurso-Doc migrado: ID ${rd.id}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Recurso-Doc ya existe: ID ${rd.id}`);
        } else {
          console.error(`  ❌ Error migrando recurso-doc ${rd.id}:`, error.message);
        }
      }
    }

    // 7. MIGRAR ENTIDAD_DOCUMENTACION
    console.log('\n📤 Migrando Entidad-Documentación...');
    const [entidadDoc] = await mysqlConnection.execute('SELECT * FROM entidad_documentacion');

    for (const ed of entidadDoc as any[]) {
      try {
        await prisma.entidadDocumentacion.create({
          data: {
            id: ed.id,
            entidadId: ed.entidadId,
            documentacionId: ed.documentacionId,
            esInhabilitante: Boolean(ed.esInhabilitante),
            notificarEmail: Boolean(ed.notificarEmail),
            fechaEmision: ed.fechaEmision ? new Date(ed.fechaEmision) : null,
            fechaTramitacion: ed.fechaTramitacion ? new Date(ed.fechaTramitacion) : null,
            fechaVencimiento: ed.fechaVencimiento ? new Date(ed.fechaVencimiento) : null,
            observaciones: ed.observaciones,
            estadoId: ed.estadoId,
            activo: Boolean(ed.activo !== undefined ? ed.activo : true),
            createdBy: ed.createdBy || 1,
            updatedBy: ed.updatedBy || ed.createdBy || 1,
            createdAt: ed.createdAt ? new Date(ed.createdAt) : new Date(),
            updatedAt: ed.updatedAt ? new Date(ed.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Entidad-Doc migrado: ID ${ed.id}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Entidad-Doc ya existe: ID ${ed.id}`);
        } else {
          console.error(`  ❌ Error migrando entidad-doc ${ed.id}:`, error.message);
        }
      }
    }

    // 8. MIGRAR ENTIDAD_RECURSO
    console.log('\n📤 Migrando Entidad-Recurso...');
    const [entidadRecurso] = await mysqlConnection.execute('SELECT * FROM entidad_recurso');

    for (const er of entidadRecurso as any[]) {
      try {
        await prisma.entidadRecurso.create({
          data: {
            id: er.id,
            entidadId: er.entidadId,
            recursoId: er.recursoId,
            fechaInicio: er.fechaInicio ? new Date(er.fechaInicio) : null,
            fechaFin: er.fechaFin ? new Date(er.fechaFin) : null,
            observaciones: er.observaciones,
            activo: Boolean(er.activo !== undefined ? er.activo : true),
            createdBy: er.createdBy || 1,
            updatedBy: er.updatedBy || er.createdBy || 1,
            createdAt: er.createdAt ? new Date(er.createdAt) : new Date(),
            updatedAt: er.updatedAt ? new Date(er.updatedAt) : new Date()
          }
        });
        console.log(`  ✅ Entidad-Recurso migrado: ID ${er.id}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`  ⏭️  Entidad-Recurso ya existe: ID ${er.id}`);
        } else {
          console.error(`  ❌ Error migrando entidad-recurso ${er.id}:`, error.message);
        }
      }
    }

    // Actualizar secuencias de PostgreSQL
    console.log('\n🔧 Actualizando secuencias de PostgreSQL...');
    const tables = [
      'usuarios', 'estados', 'recursos', 'entidades', 'documentacion',
      'recurso_documentacion', 'entidad_documentacion', 'entidad_recurso'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`
          SELECT setval(pg_get_serial_sequence('"${table}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)
        `);
        console.log(`  ✅ Secuencia actualizada: ${table}`);
      } catch (error: any) {
        console.error(`  ❌ Error actualizando secuencia ${table}:`, error.message);
      }
    }

    console.log('\n✨ Migración completada exitosamente!');

  } catch (error) {
    console.error('\n❌ Error en la migración:', error);
    throw error;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('\n🔌 Conexión MySQL cerrada');
    }
    await prisma.$disconnect();
    console.log('🔌 Conexión PostgreSQL cerrada');
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('\n✅ Proceso de migración finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migración falló:', error);
      process.exit(1);
    });
}

export default migrateData;
import mysql from 'mysql2/promise';

// Script para corregir datos problemáticos en MySQL
const mysqlConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs'
};

async function fixMySQLData() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔧 Conectando a MySQL para corregir datos...');
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL\n');

    // Verificar estado por defecto disponible
    const [stateRows] = await connection.execute(`
      SELECT id, nombre FROM estados WHERE id = 1 OR nombre LIKE '%trámite%' ORDER BY id LIMIT 1
    `);
    const estados = stateRows as any[];
    const defaultStateId = estados.length > 0 ? estados[0].id : 1;
    console.log(`🎯 Estado por defecto a usar: ID ${defaultStateId} (${estados[0]?.nombre || 'Default'})\n`);

    console.log('📋 === CORRECCIÓN 1: AGREGAR CAMPO estadoId a RECURSOS ===');

    // Verificar si la columna estadoId existe en recursos
    try {
      await connection.execute('SELECT estadoId FROM recursos LIMIT 1');
      console.log('✅ Campo estadoId ya existe en recursos');
    } catch (error) {
      console.log('➕ Agregando campo estadoId a tabla recursos...');
      await connection.execute(`
        ALTER TABLE recursos
        ADD COLUMN estadoId INT NULL,
        ADD CONSTRAINT fk_recursos_estado
        FOREIGN KEY (estadoId) REFERENCES estados(id)
      `);
      console.log('✅ Campo estadoId agregado a recursos');
    }

    // Actualizar recursos sin estadoId
    console.log('🔧 Actualizando recursos sin estadoId...');
    const [updateRecursosResult] = await connection.execute(`
      UPDATE recursos SET estadoId = ? WHERE estadoId IS NULL
    `, [defaultStateId]);
    console.log(`✅ ${(updateRecursosResult as any).affectedRows} recursos actualizados con estadoId`);

    console.log('\n🏢 === CORRECCIÓN 2: AGREGAR CAMPO estadoId a ENTIDADES ===');

    // Verificar si la columna estadoId existe en entidades
    try {
      await connection.execute('SELECT estadoId FROM entidades LIMIT 1');
      console.log('✅ Campo estadoId ya existe en entidades');
    } catch (error) {
      console.log('➕ Agregando campo estadoId a tabla entidades...');
      await connection.execute(`
        ALTER TABLE entidades
        ADD COLUMN estadoId INT NULL,
        ADD CONSTRAINT fk_entidades_estado
        FOREIGN KEY (estadoId) REFERENCES estados(id)
      `);
      console.log('✅ Campo estadoId agregado a entidades');
    }

    // Actualizar entidades sin estadoId
    console.log('🔧 Actualizando entidades sin estadoId...');
    const [updateEntidadesResult] = await connection.execute(`
      UPDATE entidades SET estadoId = ? WHERE estadoId IS NULL
    `, [defaultStateId]);
    console.log(`✅ ${(updateEntidadesResult as any).affectedRows} entidades actualizadas con estadoId`);

    console.log('\n📋 === CORRECCIÓN 3: AGREGAR CAMPO nombre a DOCUMENTACION ===');

    // Verificar si la columna nombre existe en documentacion
    try {
      await connection.execute('SELECT nombre FROM documentacion LIMIT 1');
      console.log('✅ Campo nombre ya existe en documentacion');
    } catch (error) {
      console.log('➕ Agregando campo nombre a tabla documentacion...');
      await connection.execute(`
        ALTER TABLE documentacion
        ADD COLUMN nombre VARCHAR(255) NULL
      `);
      console.log('✅ Campo nombre agregado a documentacion');
    }

    // Actualizar documentacion sin nombre usando descripcion
    console.log('🔧 Actualizando documentacion sin nombre...');
    const [updateDocsResult] = await connection.execute(`
      UPDATE documentacion
      SET nombre = COALESCE(nombre, descripcion)
      WHERE nombre IS NULL OR nombre = ''
    `);
    console.log(`✅ ${(updateDocsResult as any).affectedRows} documentos actualizados con nombre`);

    console.log('\n🏢 === CORRECCIÓN 4: AGREGAR CAMPO nombre a ENTIDADES ===');

    // Verificar si la columna nombre existe en entidades
    try {
      await connection.execute('SELECT nombre FROM entidades LIMIT 1');
      console.log('✅ Campo nombre ya existe en entidades');
    } catch (error) {
      console.log('➕ Agregando campo nombre a tabla entidades...');
      await connection.execute(`
        ALTER TABLE entidades
        ADD COLUMN nombre VARCHAR(255) NULL
      `);
      console.log('✅ Campo nombre agregado a entidades');
    }

    // Actualizar entidades sin nombre usando razonSocial
    console.log('🔧 Actualizando entidades sin nombre...');
    const [updateEntidadesNombreResult] = await connection.execute(`
      UPDATE entidades
      SET nombre = COALESCE(nombre, razonSocial)
      WHERE nombre IS NULL OR nombre = ''
    `);
    console.log(`✅ ${(updateEntidadesNombreResult as any).affectedRows} entidades actualizadas con nombre`);

    console.log('\n🔧 === CORRECCIÓN 5: AGREGAR CAMPOS FALTANTES ===');

    // Verificar y agregar campo activo a documentacion
    try {
      await connection.execute('SELECT activo FROM documentacion LIMIT 1');
      console.log('✅ Campo activo ya existe en documentacion');
    } catch (error) {
      console.log('➕ Agregando campo activo a documentacion...');
      await connection.execute(`
        ALTER TABLE documentacion
        ADD COLUMN activo TINYINT(1) DEFAULT 1
      `);
      await connection.execute(`UPDATE documentacion SET activo = 1 WHERE activo IS NULL`);
      console.log('✅ Campo activo agregado a documentacion');
    }

    // Verificar y agregar campo activo a recursos
    try {
      await connection.execute('SELECT activo FROM recursos LIMIT 1');
      console.log('✅ Campo activo ya existe en recursos');
    } catch (error) {
      console.log('➕ Agregando campo activo a recursos...');
      await connection.execute(`
        ALTER TABLE recursos
        ADD COLUMN activo TINYINT(1) DEFAULT 1
      `);
      await connection.execute(`UPDATE recursos SET activo = 1 WHERE activo IS NULL`);
      console.log('✅ Campo activo agregado a recursos');
    }

    // Verificar y agregar campo activo a entidades
    try {
      await connection.execute('SELECT activo FROM entidades LIMIT 1');
      console.log('✅ Campo activo ya existe en entidades');
    } catch (error) {
      console.log('➕ Agregando campo activo a entidades...');
      await connection.execute(`
        ALTER TABLE entidades
        ADD COLUMN activo TINYINT(1) DEFAULT 1
      `);
      await connection.execute(`UPDATE entidades SET activo = 1 WHERE activo IS NULL`);
      console.log('✅ Campo activo agregado a entidades');
    }

    console.log('\n🔧 === CORRECCIÓN 6: AGREGAR CAMPOS DE AUDITORÍA ===');

    const tablesWithAudit = ['documentacion', 'recursos', 'entidades'];
    const auditFields = ['createdBy', 'updatedBy'];

    for (const tableName of tablesWithAudit) {
      for (const fieldName of auditFields) {
        try {
          await connection.execute(`SELECT ${fieldName} FROM ${tableName} LIMIT 1`);
          console.log(`✅ Campo ${fieldName} ya existe en ${tableName}`);
        } catch (error) {
          console.log(`➕ Agregando campo ${fieldName} a ${tableName}...`);
          await connection.execute(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${fieldName} INT NULL
          `);
          // Asignar usuario 1 como valor por defecto para registros existentes
          await connection.execute(`
            UPDATE ${tableName} SET ${fieldName} = 1 WHERE ${fieldName} IS NULL
          `);
          console.log(`✅ Campo ${fieldName} agregado a ${tableName}`);
        }
      }
    }

    console.log('\n📊 === VERIFICACIÓN FINAL ===');

    // Verificar documentacion
    const [docsAfter] = await connection.execute(`
      SELECT id, codigo, nombre, descripcion, estadoId, activo, createdBy, updatedBy
      FROM documentacion LIMIT 3
    `);
    console.log('📋 Documentacion después de corrección:');
    (docsAfter as any[]).forEach(doc => {
      console.log(`   ID: ${doc.id}, CODIGO: ${doc.codigo}, NOMBRE: "${doc.nombre}", ESTADO_ID: ${doc.estadoId}, ACTIVO: ${doc.activo}`);
    });

    // Verificar recursos
    const [recursosAfter] = await connection.execute(`
      SELECT id, codigo, nombre, apellido, estadoId, activo, createdBy, updatedBy
      FROM recursos LIMIT 3
    `);
    console.log('\n🧑 Recursos después de corrección:');
    (recursosAfter as any[]).forEach(rec => {
      console.log(`   ID: ${rec.id}, CODIGO: ${rec.codigo}, NOMBRE: "${rec.nombre}", APELLIDO: "${rec.apellido}", ESTADO_ID: ${rec.estadoId}, ACTIVO: ${rec.activo}`);
    });

    // Verificar entidades
    const [entidadesAfter] = await connection.execute(`
      SELECT id, nombre, razonSocial, cuit, estadoId, activo, createdBy, updatedBy
      FROM entidades LIMIT 3
    `);
    console.log('\n🏢 Entidades después de corrección:');
    (entidadesAfter as any[]).forEach(ent => {
      console.log(`   ID: ${ent.id}, NOMBRE: "${ent.nombre}", RAZÓN_SOCIAL: "${ent.razonSocial}", ESTADO_ID: ${ent.estadoId}, ACTIVO: ${ent.activo}`);
    });

    console.log('\n🎉 ¡Corrección de datos MySQL completada exitosamente!');
    console.log('✅ Todos los campos requeridos han sido agregados y poblados');
    console.log('✅ La migración a PostgreSQL debería funcionar ahora');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📪 Conexión MySQL cerrada');
    }
  }
}

fixMySQLData().catch(console.error);
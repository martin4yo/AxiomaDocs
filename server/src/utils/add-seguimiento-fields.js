/**
 * Script para agregar campos estadoSeguimiento a las tablas
 * Ejecutar con: node src/utils/add-seguimiento-fields.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSeguimientoFields() {
  let connection;

  try {
    console.log('🔄 Conectando a la base de datos...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'axioma',
      password: process.env.DB_PASSWORD || 'axioma123',
      database: process.env.DB_NAME || 'axiomadocs'
    });

    console.log('✅ Conexión establecida');

    // Agregar campo estadoSeguimiento a recurso_documentacion
    try {
      console.log('🔄 Agregando campo estadoSeguimiento a recurso_documentacion...');
      await connection.execute(`
        ALTER TABLE recurso_documentacion
        ADD COLUMN estadoSeguimiento ENUM('pendiente', 'enviado') NOT NULL DEFAULT 'pendiente'
        COMMENT 'Estado del seguimiento del documento: pendiente o enviado'
      `);
      console.log('✅ Campo agregado a recurso_documentacion');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Campo estadoSeguimiento ya existe en recurso_documentacion');
      } else {
        throw error;
      }
    }

    // Agregar campo estadoSeguimiento a entidad_documentacion
    try {
      console.log('🔄 Agregando campo estadoSeguimiento a entidad_documentacion...');
      await connection.execute(`
        ALTER TABLE entidad_documentacion
        ADD COLUMN estadoSeguimiento ENUM('pendiente', 'enviado') NOT NULL DEFAULT 'pendiente'
        COMMENT 'Estado del seguimiento del documento: pendiente o enviado'
      `);
      console.log('✅ Campo agregado a entidad_documentacion');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Campo estadoSeguimiento ya existe en entidad_documentacion');
      } else {
        throw error;
      }
    }

    // Verificar que los campos se agregaron correctamente
    console.log('🔄 Verificando campos agregados...');

    const [recursoFields] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recurso_documentacion' AND COLUMN_NAME = 'estadoSeguimiento'
    `, [process.env.DB_NAME || 'axiomadocs']);

    const [entidadFields] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'entidad_documentacion' AND COLUMN_NAME = 'estadoSeguimiento'
    `, [process.env.DB_NAME || 'axiomadocs']);

    if (recursoFields.length > 0) {
      console.log('✅ Campo estadoSeguimiento verificado en recurso_documentacion:', recursoFields[0]);
    }

    if (entidadFields.length > 0) {
      console.log('✅ Campo estadoSeguimiento verificado en entidad_documentacion:', entidadFields[0]);
    }

    console.log('');
    console.log('🎉 Migración completada exitosamente!');
    console.log('📝 Los campos estadoSeguimiento han sido agregados a ambas tablas');
    console.log('💡 Ahora puedes reiniciar el servidor para usar la nueva funcionalidad');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('📋 Detalles del error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  addSeguimientoFields();
}

module.exports = { addSeguimientoFields };
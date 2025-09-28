/**
 * Script para crear la tabla documento_envios
 * Ejecutar con: node src/utils/add-documento-envios-table.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addDocumentoEnviosTable() {
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

    // Crear tabla documento_envios
    try {
      console.log('🔄 Creando tabla documento_envios...');
      await connection.execute(`
        CREATE TABLE documento_envios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          documentacionId INT NOT NULL,
          entidadId INT NOT NULL,
          recursoId INT NULL,
          estadoEnvio ENUM('pendiente', 'enviado', 'recibido') NOT NULL DEFAULT 'pendiente' COMMENT 'Estado del envío: pendiente, enviado o recibido',
          fechaEnvio DATETIME NULL COMMENT 'Fecha y hora del envío',
          destino VARCHAR(255) NULL COMMENT 'URL de plataforma o email donde se envió',
          observaciones TEXT NULL COMMENT 'Observaciones del envío',
          creadoPor INT NULL COMMENT 'Usuario que creó el registro',
          modificadoPor INT NULL COMMENT 'Usuario que modificó el registro',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          INDEX idx_documento_envios_documentacion (documentacionId),
          INDEX idx_documento_envios_entidad (entidadId),
          INDEX idx_documento_envios_estado (estadoEnvio),
          UNIQUE KEY unique_documento_entidad_recurso (documentacionId, entidadId, recursoId),

          FOREIGN KEY (documentacionId) REFERENCES documentacion(id) ON DELETE CASCADE,
          FOREIGN KEY (entidadId) REFERENCES entidades(id) ON DELETE CASCADE,
          FOREIGN KEY (recursoId) REFERENCES recursos(id) ON DELETE CASCADE,
          FOREIGN KEY (creadoPor) REFERENCES usuarios(id) ON DELETE SET NULL,
          FOREIGN KEY (modificadoPor) REFERENCES usuarios(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla para el tracking de envíos de documentos a entidades'
      `);
      console.log('✅ Tabla documento_envios creada exitosamente');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('ℹ️  Tabla documento_envios ya existe');
      } else {
        throw error;
      }
    }

    // Verificar que la tabla se creó correctamente
    console.log('🔄 Verificando estructura de la tabla...');

    const [tableInfo] = await connection.execute(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'documento_envios'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'axiomadocs']);

    if (tableInfo.length > 0) {
      console.log('✅ Estructura de la tabla documento_envios:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
        if (col.COLUMN_COMMENT) {
          console.log(`     // ${col.COLUMN_COMMENT}`);
        }
      });
    }

    // Verificar índices
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM documento_envios
    `);

    console.log('\n✅ Índices creados:');
    const uniqueIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
    uniqueIndexes.forEach(indexName => {
      console.log(`   - ${indexName}`);
    });

    console.log('');
    console.log('🎉 Migración completada exitosamente!');
    console.log('📝 La tabla documento_envios ha sido creada con todas sus relaciones');
    console.log('💡 Ahora puedes reiniciar el servidor para usar la nueva funcionalidad');

    // Crear algunos registros de ejemplo si no existen
    console.log('\n🔄 Verificando si existen documentos y entidades para crear ejemplos...');

    const [documentos] = await connection.execute(`SELECT id, codigo FROM documentacion LIMIT 3`);
    const [entidades] = await connection.execute(`SELECT id, razonSocial FROM entidades LIMIT 3`);

    if (documentos.length > 0 && entidades.length > 0) {
      console.log('📄 Creando registros de ejemplo...');

      // Crear algunos envíos de ejemplo
      for (let i = 0; i < Math.min(documentos.length, entidades.length, 2); i++) {
        try {
          await connection.execute(`
            INSERT INTO documento_envios (documentacionId, entidadId, estadoEnvio, observaciones)
            VALUES (?, ?, 'pendiente', 'Registro de ejemplo creado automáticamente')
            ON DUPLICATE KEY UPDATE observaciones = 'Registro de ejemplo - ya existía'
          `, [documentos[i].id, entidades[i].id]);

          console.log(`   ✅ Envío de ejemplo: ${documentos[i].codigo} → ${entidades[i].razonSocial}`);
        } catch (exampleError) {
          console.log(`   ⚠️  No se pudo crear ejemplo: ${documentos[i].codigo} → ${entidades[i].razonSocial}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('📋 Detalles del error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  addDocumentoEnviosTable();
}

module.exports = { addDocumentoEnviosTable };
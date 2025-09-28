const mysql = require('mysql2/promise');
require('dotenv').config();

async function addEmailColumnToEntidades() {
  let connection;

  try {
    // Crear conexión a MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'axiomadocs',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('🔗 Conectado a MySQL');

    // Verificar si la columna ya existe
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'entidades'
      AND COLUMN_NAME = 'email'
    `, [process.env.DB_DATABASE || 'axiomadocs']);

    if (columns.length > 0) {
      console.log('✅ La columna email ya existe en la tabla entidades');
      return;
    }

    // Agregar la columna email después de localidad
    await connection.execute(`
      ALTER TABLE entidades
      ADD COLUMN email VARCHAR(255) NULL
      AFTER localidad
    `);

    console.log('✅ Columna email agregada exitosamente a la tabla entidades');

    // Agregar comentario a la columna
    await connection.execute(`
      ALTER TABLE entidades
      MODIFY COLUMN email VARCHAR(255) NULL
      COMMENT 'Email para el envío de documentación'
    `);

    console.log('✅ Comentario agregado a la columna email');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addEmailColumnToEntidades()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migración falló:', error);
      process.exit(1);
    });
}

module.exports = addEmailColumnToEntidades;
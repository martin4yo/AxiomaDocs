#!/usr/bin/env node
const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkMigration() {
  const usePostgres = process.env.USE_POSTGRES === 'true';

  let sequelize;
  if (usePostgres) {
    sequelize = new Sequelize(
      process.env.PG_DATABASE || 'axiomadocs_pg',
      process.env.PG_USERNAME || 'postgres',
      process.env.PG_PASSWORD || '',
      {
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        dialect: 'postgres',
        logging: false
      }
    );
  } else {
    sequelize = new Sequelize(
      process.env.DB_NAME || 'axiomadocs',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        dialect: 'mysql',
        logging: false
      }
    );
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos exitosa');

    // Verificar estructura actual
    const [tablesCols] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${usePostgres ? 'public' : (process.env.DB_NAME || 'axiomadocs')}'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    console.log('\n📊 Tablas y columnas actuales:');
    let currentTable = '';
    tablesCols.forEach(row => {
      if (row.TABLE_NAME !== currentTable) {
        currentTable = row.TABLE_NAME;
        console.log(`\n🔹 ${currentTable}:`);
      }
      console.log(`  - ${row.COLUMN_NAME}`);
    });

    // Verificar si necesita migración
    const needsMigration = {
      estadoCodigo: !tablesCols.some(row => row.TABLE_NAME === 'estados' && row.COLUMN_NAME === 'codigo'),
      estadoLogs: !tablesCols.some(row => row.TABLE_NAME === 'estado_documento_logs')
    };

    console.log('\n🔍 Estado de migración:');
    console.log(`Campo estados.codigo: ${needsMigration.estadoCodigo ? '❌ FALTA' : '✅ EXISTE'}`);
    console.log(`Tabla estado_documento_logs: ${needsMigration.estadoLogs ? '❌ FALTA' : '✅ EXISTE'}`);

    if (needsMigration.estadoCodigo || needsMigration.estadoLogs) {
      console.log('\n⚠️  MIGRACIÓN NECESARIA');
      console.log('Ejecuta: DB_ALLOW_ALTER=true npm start');
    } else {
      console.log('\n✅ Base de datos actualizada, no necesita migración');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkMigration();
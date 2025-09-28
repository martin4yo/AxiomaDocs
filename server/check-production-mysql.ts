import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Script para verificar la estructura de MySQL en PRODUCCIÓN
dotenv.config({ path: '.env.production' });

const mysqlConfig = {
  host: '149.50.148.198',
  port: 3306,
  user: 'root',
  password: process.env.MYSQL_PROD_PASSWORD || '',
  database: 'axiomadocs',
  connectTimeout: 60000
};

async function checkProductionMySQL() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔍 Conectando a MySQL de PRODUCCIÓN (149.50.148.198)...');

    if (!process.env.MYSQL_PROD_PASSWORD) {
      console.error('❌ Falta MYSQL_PROD_PASSWORD en .env.production');
      console.log('Crea un archivo .env.production con:');
      console.log('MYSQL_PROD_PASSWORD=tu_password_mysql');
      process.exit(1);
    }

    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL de producción\n');

    // Mostrar todas las tablas disponibles
    console.log('📋 === TABLAS DISPONIBLES EN PRODUCCIÓN ===');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = (tables as any[]).map(t => Object.values(t)[0]);
    console.log('Tablas encontradas:', tableNames.join(', '));
    console.log('Total de tablas:', tableNames.length);

    // Contar registros en cada tabla principal
    console.log('\n📊 === CONTEO DE REGISTROS ===');
    const mainTables = [
      'usuarios', 'estados', 'documentacion', 'recursos',
      'entidades', 'recurso_documentacion', 'entidad_documentacion', 'entidad_recurso'
    ];

    let totalRecords = 0;
    for (const tableName of mainTables) {
      if (tableNames.includes(tableName)) {
        try {
          const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = (countResult as any[])[0].count;
          console.log(`   ${tableName}: ${count} registros`);
          totalRecords += count;
        } catch (error) {
          console.log(`   ${tableName}: Error al contar`);
        }
      } else {
        console.log(`   ${tableName}: No existe`);
      }
    }
    console.log(`\n📊 Total de registros en tablas principales: ${totalRecords}`);

    // Verificar estructura de una tabla de ejemplo
    console.log('\n🔍 === ESTRUCTURA DE TABLA EJEMPLO (usuarios) ===');
    if (tableNames.includes('usuarios')) {
      const [columns] = await connection.execute('DESCRIBE usuarios');
      console.log('Columnas de usuarios:');
      (columns as any[]).forEach(col => {
        console.log(`   ${col.Field} - ${col.Type} - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Mostrar un registro de ejemplo
      const [sampleData] = await connection.execute('SELECT * FROM usuarios LIMIT 1');
      if ((sampleData as any[]).length > 0) {
        console.log('\n📋 Usuario de ejemplo:');
        const user = (sampleData as any[])[0];
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nombre: ${user.nombre} ${user.apellido}`);
      }
    }

    // Verificar si hay tablas adicionales no esperadas
    const additionalTables = tableNames.filter(t => !mainTables.includes(t));
    if (additionalTables.length > 0) {
      console.log('\n⚠️  === TABLAS ADICIONALES ENCONTRADAS ===');
      console.log('Estas tablas también existen pero no están en la lista principal:');
      for (const table of additionalTables) {
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const count = (countResult as any[])[0].count;
        console.log(`   ${table}: ${count} registros`);
      }
    }

    console.log('\n✅ Verificación de MySQL de producción completada');
    console.log('\n💡 Próximos pasos:');
    console.log('1. Configura POSTGRES_PROD_URL en .env.production');
    console.log('2. Ejecuta: npx ts-node migrate-production-mysql-to-postgres.ts');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    console.log('\n💡 Posibles causas:');
    console.log('1. MySQL no permite conexiones remotas');
    console.log('2. El usuario root no tiene permisos desde tu IP');
    console.log('3. El firewall bloquea el puerto 3306');
    console.log('4. La contraseña es incorrecta');
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📪 Conexión MySQL cerrada');
    }
  }
}

checkProductionMySQL().catch(console.error);
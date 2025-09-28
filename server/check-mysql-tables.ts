import mysql from 'mysql2/promise';

// Configuración de MySQL
const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs',
  port: 3306
};

async function checkTables() {
  let connection;

  try {
    console.log('🔍 Conectando a MySQL para verificar tablas...\n');

    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL exitosamente');

    // Obtener lista de tablas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Tablas encontradas:');
    (tables as any[]).forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

    // Verificar estructuras de tablas principales
    const mainTables = ['usuarios', 'estados', 'recursos', 'entidades', 'documentacion'];

    for (const tableName of mainTables) {
      try {
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log(`\n🔍 Estructura de ${tableName}:`);
        (columns as any[]).forEach((col: any) => {
          console.log(`  - ${col.Field}: ${col.Type}${col.Null === 'NO' ? ' NOT NULL' : ''}`);
        });

        // Contar registros
        const [count] = await connection.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
        console.log(`📊 Total registros: ${(count as any[])[0].total}`);
      } catch (error) {
        console.log(`❌ Tabla ${tableName} no encontrada`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error conectando a MySQL:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verificar que MySQL esté corriendo');
    console.log('2. Comprobar credenciales en mysqlConfig');
    console.log('3. Asegurar que la base de datos existe');
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión MySQL cerrada');
    }
  }
}

checkTables();
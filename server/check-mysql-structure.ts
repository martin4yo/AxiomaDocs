import mysql from 'mysql2/promise';

// Script para verificar la estructura real de las tablas MySQL
const mysqlConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Q27G4B98',
  database: 'axiomadocs'
};

async function checkMySQLStructure() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('🔍 Conectando a MySQL para verificar estructura...');
    connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conectado a MySQL\n');

    // Mostrar todas las tablas disponibles
    console.log('📋 === TABLAS DISPONIBLES ===');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = (tables as any[]).map(t => Object.values(t)[0]);
    console.log('Tablas encontradas:', tableNames.join(', '));

    // Verificar estructura de cada tabla relevante
    const tablesToCheck = ['usuarios', 'estados', 'documentacion', 'recursos', 'entidades'];

    for (const tableName of tablesToCheck) {
      if (tableNames.includes(tableName)) {
        console.log(`\n🔍 === ESTRUCTURA TABLA: ${tableName.toUpperCase()} ===`);

        try {
          // Describir estructura
          const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
          console.log('Columnas:');
          (columns as any[]).forEach(col => {
            console.log(`   ${col.Field} - ${col.Type} - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} - ${col.Key ? `KEY: ${col.Key}` : ''} - Default: ${col.Default || 'NULL'}`);
          });

          // Contar registros
          const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = (countResult as any[])[0].count;
          console.log(`📊 Total registros: ${count}`);

          // Mostrar algunos datos de ejemplo si hay registros
          if (count > 0) {
            const [sampleData] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
            console.log('📋 Datos de ejemplo:');
            (sampleData as any[]).forEach((row, index) => {
              console.log(`   Registro ${index + 1}:`, JSON.stringify(row, null, 2));
            });
          }

        } catch (error) {
          console.log(`❌ Error verificando tabla ${tableName}:`, error);
        }
      } else {
        console.log(`\n⚠️  Tabla ${tableName} no encontrada`);
      }
    }

    // Verificar también tablas relacionales
    const relationalTables = ['recurso_documentacion', 'entidad_documentacion', 'entidad_recurso'];

    for (const tableName of relationalTables) {
      if (tableNames.includes(tableName)) {
        console.log(`\n🔗 === TABLA RELACIONAL: ${tableName.toUpperCase()} ===`);

        try {
          const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
          console.log('Columnas:');
          (columns as any[]).forEach(col => {
            console.log(`   ${col.Field} - ${col.Type} - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
          });

          const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = (countResult as any[])[0].count;
          console.log(`📊 Total registros: ${count}`);

        } catch (error) {
          console.log(`❌ Error verificando tabla ${tableName}:`, error);
        }
      }
    }

    console.log('\n✅ Verificación de estructura completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📪 Conexión MySQL cerrada');
    }
  }
}

checkMySQLStructure().catch(console.error);
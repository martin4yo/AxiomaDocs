const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

async function testMySQLConnection() {
  try {
    console.log('🔍 Probando conexión a MySQL...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Conexión a MySQL exitosa');
    
    // Verificar si existe la base de datos
    const [databases] = await connection.execute(
      "SHOW DATABASES LIKE 'axiomadocs'"
    );
    
    if (databases.length > 0) {
      console.log('✅ Base de datos "axiomadocs" encontrada');
    } else {
      console.log('❌ Base de datos "axiomadocs" no encontrada');
      console.log('📝 Ejecuta el siguiente comando para crearla:');
      console.log('   CREATE DATABASE axiomadocs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    }

    // Probar conexión específica a axiomadocs
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'axiomadocs',
    });

    console.log('✅ Conexión a base de datos "axiomadocs" exitosa');

    await connection.end();
    await dbConnection.end();
    
    console.log('\n🎉 Todo listo para usar MySQL con AxiomaDocs');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verifica que MySQL esté ejecutándose');
    console.log('   2. Verifica las credenciales en el archivo .env');
    console.log('   3. Crea la base de datos "axiomadocs" si no existe');
    console.log('   4. Verifica los permisos del usuario');
  }
}

testMySQLConnection();
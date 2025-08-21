const mysql = require('mysql2/promise');
const { Client } = require('pg');
require('dotenv').config();

async function migrateData() {
  let mysqlConnection;
  let pgClient;

  try {
    // MySQL connection
    console.log('🔄 Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT_MYSQL || '3306'),
      database: process.env.DB_NAME_MYSQL || 'axiomadocs',
      user: process.env.DB_USER_MYSQL || 'root',
      password: process.env.DB_PASSWORD_MYSQL || process.env.DB_PASSWORD,
      charset: 'utf8mb4'
    });
    console.log('✅ Connected to MySQL');

    // PostgreSQL connection
    console.log('🔄 Connecting to PostgreSQL...');
    pgClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'axiomadocs_pg',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Define tables in dependency order
    const tables = [
      'usuarios',
      'estados', 
      'documentacion',
      'recursos',
      'entidades',
      'recurso_documentacion',
      'entidad_documentacion',
      'entidad_recursos'
    ];

    // Get table counts from MySQL
    console.log('\n📊 Checking MySQL data...');
    for (const table of tables) {
      try {
        const [rows] = await mysqlConnection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${rows[0].count} records`);
      } catch (error) {
        console.log(`   ${table}: Table not found or error`);
      }
    }

    // Migrate each table
    for (const table of tables) {
      try {
        console.log(`\n🔄 Migrating table: ${table}`);
        
        // Get all data from MySQL
        const [rows] = await mysqlConnection.execute(`SELECT * FROM ${table}`);
        
        if (rows.length === 0) {
          console.log(`   ⚠️ No data found in ${table}`);
          continue;
        }

        // Clear PostgreSQL table first
        await pgClient.query(`DELETE FROM "${table}"`);
        console.log(`   🗑️ Cleared PostgreSQL table: ${table}`);

        // Insert data into PostgreSQL
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
          const columnsStr = columns.map(col => `"${col}"`).join(', ');
          
          const insertQuery = `
            INSERT INTO "${table}" (${columnsStr}) 
            VALUES (${placeholders})
          `;

          let insertedCount = 0;
          for (const row of rows) {
            try {
              const values = columns.map(col => {
                const value = row[col];
                // Convert MySQL boolean (tinyint) to PostgreSQL boolean
                if (typeof value === 'number' && (value === 0 || value === 1)) {
                  // Check if this might be a boolean field
                  if (col.toLowerCase().includes('es') || col.toLowerCase().includes('is')) {
                    return value === 1;
                  }
                }
                return value;
              });
              
              await pgClient.query(insertQuery, values);
              insertedCount++;
            } catch (insertError) {
              console.log(`   ❌ Error inserting row in ${table}:`, insertError.message);
              console.log(`   Row data:`, row);
            }
          }
          
          console.log(`   ✅ Inserted ${insertedCount}/${rows.length} records into ${table}`);
          
          // Reset sequence for auto-increment columns
          if (columns.includes('id')) {
            try {
              await pgClient.query(`
                SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM "${table}"), 1), false)
              `);
              console.log(`   🔢 Reset sequence for ${table}`);
            } catch (seqError) {
              console.log(`   ⚠️ Could not reset sequence for ${table}: ${seqError.message}`);
            }
          }
        }
        
      } catch (tableError) {
        console.log(`   ❌ Error migrating table ${table}:`, tableError.message);
      }
    }

    // Verify migration
    console.log('\n📊 Verifying PostgreSQL data...');
    for (const table of tables) {
      try {
        const result = await pgClient.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`   ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${table}: Error checking - ${error.message}`);
      }
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('🔌 Disconnected from MySQL');
    }
    if (pgClient) {
      await pgClient.end();
      console.log('🔌 Disconnected from PostgreSQL');
    }
  }
}

console.log('🚚 MySQL to PostgreSQL Data Migration');
console.log('======================================');
console.log('Make sure both databases are running and accessible.');
console.log('This script will copy all data from MySQL to PostgreSQL.');
console.log('PostgreSQL data will be CLEARED before migration.');
console.log('');

// Add confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continue with migration? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    migrateData();
  } else {
    console.log('Migration cancelled.');
    rl.close();
    process.exit(0);
  }
});
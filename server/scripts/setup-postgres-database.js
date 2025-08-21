const { Client } = require('pg');
require('dotenv').config();

async function setupPostgresDatabase() {
  const dbName = process.env.DB_NAME || 'axiomadocs_pg';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');

  // Connect to postgres database first to create our database
  const adminClient = new Client({
    host: dbHost,
    port: dbPort,
    database: 'postgres', // Connect to default postgres database
    user: dbUser,
    password: dbPassword,
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔄 Connecting to PostgreSQL server...');
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const dbExists = await adminClient.query(checkDbQuery, [dbName]);

    if (dbExists.rows.length === 0) {
      console.log(`🗄️ Creating database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database ${dbName} created successfully`);
    } else {
      console.log(`🗄️ Database ${dbName} already exists`);
    }

    await adminClient.end();

    // Now connect to our database to set up extensions
    const dbClient = new Client({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    });

    await dbClient.connect();
    console.log(`✅ Connected to database: ${dbName}`);

    // Create useful extensions
    try {
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID extension created');
    } catch (error) {
      console.log('⚠️ UUID extension already exists or cannot be created');
    }

    try {
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "hstore"');
      console.log('✅ HSTORE extension created');
    } catch (error) {
      console.log('⚠️ HSTORE extension already exists or cannot be created');
    }

    // Set timezone
    try {
      await dbClient.query(`SET timezone = 'America/Argentina/Buenos_Aires'`);
      console.log('✅ Timezone set to America/Argentina/Buenos_Aires');
    } catch (error) {
      console.log('⚠️ Could not set timezone');
    }

    // Show database info
    const versionResult = await dbClient.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', versionResult.rows[0].version.split(',')[0]);

    const timezoneResult = await dbClient.query('SHOW timezone');
    console.log('🌍 Current Timezone:', timezoneResult.rows[0].TimeZone);

    await dbClient.end();
    console.log('🎉 PostgreSQL database setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up PostgreSQL database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure PostgreSQL server is running');
      console.log('2. Check if the port 5432 is correct');
      console.log('3. Verify host and credentials in .env file');
      console.log('4. Try connecting with psql: psql -h localhost -U postgres');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check username and password.');
    } else if (error.code === '42P04') {
      console.log('\n💡 Database already exists, which is fine.');
    }
    
    process.exit(1);
  }
}

console.log('🐘 PostgreSQL Database Setup');
console.log('==============================');
setupPostgresDatabase();
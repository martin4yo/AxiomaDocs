const { Client } = require('pg');
require('dotenv').config();

async function testPostgresConnection() {
  // Use PostgreSQL defaults regardless of current .env
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres', // Connect to default postgres database first
    user: 'postgres',
    password: '', // You may need to set this
    ssl: false
  });

  try {
    console.log('🔄 Attempting to connect to PostgreSQL...');
    console.log(`📍 Host: localhost`);
    console.log(`📍 Port: 5432`);
    console.log(`📍 Database: postgres`);
    console.log(`📍 User: postgres`);
    
    await client.connect();
    console.log('✅ PostgreSQL connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', result.rows[0].version);
    
    // Check if database exists
    const dbCheck = await client.query('SELECT current_database()');
    console.log('🗄️ Current Database:', dbCheck.rows[0].current_database);
    
    // Check timezone
    const timezoneCheck = await client.query('SHOW timezone');
    console.log('🌍 Timezone:', timezoneCheck.rows[0].TimeZone);
    
    await client.end();
    
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:');
    console.error('Error details:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure PostgreSQL server is running');
      console.log('2. Check if the port 5432 is correct');
      console.log('3. Verify host and credentials in .env file');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist. You need to create it first:');
      console.log(`   CREATE DATABASE ${process.env.DB_NAME || 'axiomadocs_pg'};`);
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check username and password.');
    }
    
    process.exit(1);
  }
}

console.log('🐘 PostgreSQL Connection Test');
console.log('================================');
testPostgresConnection();
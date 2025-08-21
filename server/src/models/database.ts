import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Determine which database to use based on environment variable
const usePostgres = process.env.USE_POSTGRES === 'true';

const sequelize = new Sequelize({
  dialect: usePostgres ? 'postgres' : 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || (usePostgres ? '5432' : '3306')),
  database: process.env.DB_NAME || (usePostgres ? 'axiomadocs_pg' : 'axiomadocs'),
  username: process.env.DB_USER || (usePostgres ? 'postgres' : 'root'),
  password: process.env.DB_PASSWORD || '',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: usePostgres ? {
    // PostgreSQL specific options
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
  } : {
    // MySQL specific options
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  define: usePostgres ? {
    // PostgreSQL defaults
    timestamps: true,
    underscored: false,
  } : {
    // MySQL defaults
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  timezone: 'America/Argentina/Buenos_Aires', // Using IANA timezone identifier
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export default sequelize;
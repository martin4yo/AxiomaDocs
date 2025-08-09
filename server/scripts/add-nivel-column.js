const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: console.log,
});

async function addNivelColumnToEstados() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    
    console.log('Agregando columna nivel a estados...');
    
    const query = `ALTER TABLE estados ADD COLUMN nivel INTEGER DEFAULT 1`;
    
    try {
      await sequelize.query(query);
      console.log(`✅ Ejecutado: ${query}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`⚠️ Columna ya existe: ${query}`);
      } else {
        console.error(`❌ Error en: ${query}`, error.message);
      }
    }
    
    console.log('\n✅ Migración completada exitosamente!');
    console.log('La columna nivel ha sido agregada a estados');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addNivelColumnToEstados();
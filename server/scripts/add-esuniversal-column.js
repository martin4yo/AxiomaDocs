const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: console.log,
});

async function addEsUniversalColumnToDocumentacion() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    
    console.log('Agregando columna esUniversal a documentacion...');
    
    const query = `ALTER TABLE documentacion ADD COLUMN esUniversal BOOLEAN DEFAULT 0`;
    
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
    console.log('La columna esUniversal ha sido agregada a documentacion');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addEsUniversalColumnToDocumentacion();
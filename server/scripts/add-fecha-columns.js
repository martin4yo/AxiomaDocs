const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: console.log,
});

async function addFechaColumnsToEntidadDocumentacion() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    
    console.log('Agregando columnas de fechas a entidad_documentacion...');
    
    // Agregar columnas una por una para evitar errores si alguna ya existe
    const queries = [
      `ALTER TABLE entidad_documentacion ADD COLUMN fechaEmision DATE`,
      `ALTER TABLE entidad_documentacion ADD COLUMN fechaTramitacion DATE`, 
      `ALTER TABLE entidad_documentacion ADD COLUMN fechaVencimiento DATE`
    ];
    
    for (const query of queries) {
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
    }
    
    console.log('\n✅ Migración completada exitosamente!');
    console.log('Las columnas de fechas han sido agregadas a entidad_documentacion');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addFechaColumnsToEntidadDocumentacion();
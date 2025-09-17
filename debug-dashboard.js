const { Sequelize, DataTypes } = require('./server/node_modules/sequelize');

// Configuración de la base de datos
const sequelize = new Sequelize('axiomadocs', 'root', 'Q27G4B98', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

// Modelos simplificados
const RecursoDocumentacion = sequelize.define('RecursoDocumentacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fechaVencimiento: DataTypes.DATE
}, { tableName: 'recurso_documentacion' });

const EntidadDocumentacion = sequelize.define('EntidadDocumentacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fechaVencimiento: DataTypes.DATE
}, { tableName: 'entidad_documentacion' });

const Documentacion = sequelize.define('Documentacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fechaVencimiento: DataTypes.DATE,
  esUniversal: DataTypes.BOOLEAN
}, { tableName: 'documentacion' });

async function debugDashboard() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');

    // Verificar datos en RecursoDocumentacion
    const totalRecursoDoc = await RecursoDocumentacion.count();
    const recursoDocConFecha = await RecursoDocumentacion.count({
      where: { fechaVencimiento: { [Sequelize.Op.not]: null } }
    });

    // Verificar documentos vencidos en RecursoDocumentacion
    const recursoDocVencidos = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Sequelize.Op.lt]: new Date(),
          [Sequelize.Op.not]: null
        }
      }
    });

    console.log('\n📊 RECURSO DOCUMENTACION:');
    console.log(`Total registros: ${totalRecursoDoc}`);
    console.log(`Con fecha vencimiento: ${recursoDocConFecha}`);
    console.log(`Vencidos: ${recursoDocVencidos}`);

    // Verificar datos en EntidadDocumentacion
    const totalEntidadDoc = await EntidadDocumentacion.count();
    const entidadDocConFecha = await EntidadDocumentacion.count({
      where: { fechaVencimiento: { [Sequelize.Op.not]: null } }
    });

    const entidadDocVencidos = await EntidadDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Sequelize.Op.lt]: new Date(),
          [Sequelize.Op.not]: null
        }
      }
    });

    console.log('\n📊 ENTIDAD DOCUMENTACION:');
    console.log(`Total registros: ${totalEntidadDoc}`);
    console.log(`Con fecha vencimiento: ${entidadDocConFecha}`);
    console.log(`Vencidos: ${entidadDocVencidos}`);

    // Verificar documentos universales
    const totalDocUniversal = await Documentacion.count({ where: { esUniversal: true } });
    const docUniversalConFecha = await Documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: { [Sequelize.Op.not]: null }
      }
    });

    const docUniversalVencidos = await Documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          [Sequelize.Op.lt]: new Date(),
          [Sequelize.Op.not]: null
        }
      }
    });

    console.log('\n📊 DOCUMENTACION UNIVERSAL:');
    console.log(`Total universales: ${totalDocUniversal}`);
    console.log(`Con fecha vencimiento: ${docUniversalConFecha}`);
    console.log(`Vencidos: ${docUniversalVencidos}`);

    // Buscar algunos ejemplos de fechas
    if (recursoDocConFecha > 0) {
      const ejemplosRecurso = await RecursoDocumentacion.findAll({
        where: { fechaVencimiento: { [Sequelize.Op.not]: null } },
        limit: 3,
        order: [['fechaVencimiento', 'ASC']]
      });
      console.log('\n📅 EJEMPLOS RECURSO DOCUMENTACION:');
      ejemplosRecurso.forEach(doc => {
        console.log(`ID: ${doc.id}, Fecha: ${doc.fechaVencimiento}`);
      });
    }

    if (entidadDocConFecha > 0) {
      const ejemplosEntidad = await EntidadDocumentacion.findAll({
        where: { fechaVencimiento: { [Sequelize.Op.not]: null } },
        limit: 3,
        order: [['fechaVencimiento', 'ASC']]
      });
      console.log('\n📅 EJEMPLOS ENTIDAD DOCUMENTACION:');
      ejemplosEntidad.forEach(doc => {
        console.log(`ID: ${doc.id}, Fecha: ${doc.fechaVencimiento}`);
      });
    }

    if (docUniversalConFecha > 0) {
      const ejemplosUniversal = await Documentacion.findAll({
        where: {
          esUniversal: true,
          fechaVencimiento: { [Sequelize.Op.not]: null }
        },
        limit: 3,
        order: [['fechaVencimiento', 'ASC']]
      });
      console.log('\n📅 EJEMPLOS DOCUMENTACION UNIVERSAL:');
      ejemplosUniversal.forEach(doc => {
        console.log(`ID: ${doc.id}, Fecha: ${doc.fechaVencimiento}, Universal: ${doc.esUniversal}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

debugDashboard();
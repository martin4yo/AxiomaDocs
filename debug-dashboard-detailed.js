const { Sequelize, DataTypes, Op } = require('./server/node_modules/sequelize');

// Configuración de la base de datos
const sequelize = new Sequelize('axiomadocs', 'root', 'Q27G4B98', {
  host: 'localhost',
  dialect: 'mysql',
  logging: console.log // Mostrar las consultas SQL
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

async function debugDashboardDetailed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');

    const ahora = new Date();
    console.log(`\n🕐 Fecha actual: ${ahora}`);

    // Documentos vencidos de recursos - IGUAL AL CONTROLADOR
    console.log('\n📊 TESTEO EXACTO DEL CONTROLADOR - RECURSOS VENCIDOS:');
    const documentosVencidosRecurso = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.lt]: new Date(),
          [Op.not]: null
        }
      }
    });
    console.log(`Resultado RecursoDocumentacion vencidos: ${documentosVencidosRecurso}`);

    // Documentos vencidos de entidades - IGUAL AL CONTROLADOR
    console.log('\n📊 TESTEO EXACTO DEL CONTROLADOR - ENTIDADES VENCIDOS:');
    const documentosVencidosEntidad = await EntidadDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.lt]: new Date(),
          [Op.not]: null
        }
      }
    });
    console.log(`Resultado EntidadDocumentacion vencidos: ${documentosVencidosEntidad}`);

    // Documentos universales vencidos - IGUAL AL CONTROLADOR
    console.log('\n📊 TESTEO EXACTO DEL CONTROLADOR - UNIVERSALES VENCIDOS:');
    const documentosVencidosUniversal = await Documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          [Op.lt]: new Date(),
          [Op.not]: null
        }
      }
    });
    console.log(`Resultado Documentacion universal vencidos: ${documentosVencidosUniversal}`);

    const totalVencidos = documentosVencidosRecurso + documentosVencidosEntidad + documentosVencidosUniversal;
    console.log(`\n🔢 TOTAL VENCIDOS (suma): ${totalVencidos}`);

    // Documentos por vencer (próximos 30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    console.log(`\n📅 Fecha límite (30 días): ${fechaLimite}`);

    console.log('\n📊 TESTEO EXACTO DEL CONTROLADOR - RECURSOS POR VENCER:');
    const documentosPorVencerRecurso = await RecursoDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite],
          [Op.not]: null
        }
      }
    });
    console.log(`Resultado RecursoDocumentacion por vencer: ${documentosPorVencerRecurso}`);

    console.log('\n📊 TESTEO EXACTO DEL CONTROLADOR - ENTIDADES POR VENCER:');
    const documentosPorVencerEntidad = await EntidadDocumentacion.count({
      where: {
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite],
          [Op.not]: null
        }
      }
    });
    console.log(`Resultado EntidadDocumentacion por vencer: ${documentosPorVencerEntidad}`);

    console.log('\n📊 TESTEO EXACTO DEL CONTROLADOR - UNIVERSALES POR VENCER:');
    const documentosPorVencerUniversal = await Documentacion.count({
      where: {
        esUniversal: true,
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite],
          [Op.not]: null
        }
      }
    });
    console.log(`Resultado Documentacion universal por vencer: ${documentosPorVencerUniversal}`);

    const totalPorVencer = documentosPorVencerRecurso + documentosPorVencerEntidad + documentosPorVencerUniversal;
    console.log(`\n🔢 TOTAL POR VENCER (suma): ${totalPorVencer}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

debugDashboardDetailed();
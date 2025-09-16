import sequelize from './database';
import Usuario from './Usuario';
import Estado from './Estado';
import Recurso from './Recurso';
import Documentacion from './Documentacion';
import Entidad from './Entidad';
import RecursoDocumentacion from './RecursoDocumentacion';
import EntidadDocumentacion from './EntidadDocumentacion';
import EntidadRecurso from './EntidadRecurso';
import Workflow from './Workflow';
import Intercambio from './Intercambio';
import EstadoDocumentoLog from './EstadoDocumentoLog';

// Definir asociaciones

// Usuario associations
Usuario.hasMany(Estado, { foreignKey: 'creadoPor', as: 'estadosCreados' });
Usuario.hasMany(Estado, { foreignKey: 'modificadoPor', as: 'estadosModificados' });
Usuario.hasMany(Recurso, { foreignKey: 'creadoPor', as: 'recursosCreados' });
Usuario.hasMany(Recurso, { foreignKey: 'modificadoPor', as: 'recursosModificados' });
Usuario.hasMany(Documentacion, { foreignKey: 'creadoPor', as: 'documentacionCreada' });
Usuario.hasMany(Documentacion, { foreignKey: 'modificadoPor', as: 'documentacionModificada' });
Usuario.hasMany(Entidad, { foreignKey: 'creadoPor', as: 'entidadesCreadas' });
Usuario.hasMany(Entidad, { foreignKey: 'modificadoPor', as: 'entidadesModificadas' });

// Estado associations
Estado.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
Estado.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });
Estado.hasMany(Documentacion, { foreignKey: 'estadoVencimientoId', as: 'documentacionVencimiento' });
Estado.hasMany(Documentacion, { foreignKey: 'estadoId', as: 'documentacion' });
Estado.hasMany(RecursoDocumentacion, { foreignKey: 'estadoId', as: 'recursoDocumentacion' });

// Recurso associations
Recurso.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
Recurso.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });
Recurso.belongsToMany(Documentacion, { 
  through: RecursoDocumentacion, 
  foreignKey: 'recursoId',
  otherKey: 'documentacionId',
  as: 'documentacion'
});
Recurso.hasMany(RecursoDocumentacion, { foreignKey: 'recursoId', as: 'recursoDocumentacion' });
Recurso.hasMany(EntidadRecurso, { foreignKey: 'recursoId', as: 'entidadRecurso' });
Recurso.belongsToMany(Entidad, {
  through: EntidadRecurso,
  foreignKey: 'recursoId',
  otherKey: 'entidadId',
  as: 'entidades'
});

// Documentacion associations
Documentacion.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
Documentacion.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });
Documentacion.belongsTo(Estado, { foreignKey: 'estadoVencimientoId', as: 'estadoVencimiento' });
Documentacion.belongsTo(Estado, { foreignKey: 'estadoId', as: 'estado' });
Documentacion.belongsToMany(Recurso, { 
  through: RecursoDocumentacion, 
  foreignKey: 'documentacionId',
  otherKey: 'recursoId',
  as: 'recursos'
});
Documentacion.hasMany(RecursoDocumentacion, { foreignKey: 'documentacionId', as: 'recursoDocumentacion' });
Documentacion.belongsToMany(Entidad, {
  through: EntidadDocumentacion,
  foreignKey: 'documentacionId',
  otherKey: 'entidadId',
  as: 'entidades'
});

// Entidad associations
Entidad.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
Entidad.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });
Entidad.belongsToMany(Documentacion, {
  through: EntidadDocumentacion,
  foreignKey: 'entidadId',
  otherKey: 'documentacionId',
  as: 'documentacion'
});
Entidad.hasMany(EntidadDocumentacion, { foreignKey: 'entidadId', as: 'entidadDocumentacion' });
Entidad.belongsToMany(Recurso, {
  through: EntidadRecurso,
  foreignKey: 'entidadId',
  otherKey: 'recursoId',
  as: 'recursos'
});
Entidad.hasMany(EntidadRecurso, { foreignKey: 'entidadId', as: 'entidadRecurso' });

// RecursoDocumentacion associations
RecursoDocumentacion.belongsTo(Recurso, { foreignKey: 'recursoId', as: 'recurso' });
RecursoDocumentacion.belongsTo(Documentacion, { foreignKey: 'documentacionId', as: 'documentacion' });
RecursoDocumentacion.belongsTo(Estado, { foreignKey: 'estadoId', as: 'estado' });
RecursoDocumentacion.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
RecursoDocumentacion.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });

// EntidadDocumentacion associations
EntidadDocumentacion.belongsTo(Entidad, { foreignKey: 'entidadId', as: 'entidad' });
EntidadDocumentacion.belongsTo(Documentacion, { foreignKey: 'documentacionId', as: 'documentacion' });
EntidadDocumentacion.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
EntidadDocumentacion.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });

// EntidadRecurso associations
EntidadRecurso.belongsTo(Entidad, { foreignKey: 'entidadId', as: 'entidad' });
EntidadRecurso.belongsTo(Recurso, { foreignKey: 'recursoId', as: 'recurso' });
EntidadRecurso.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
EntidadRecurso.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });

// Workflow associations
Workflow.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
Workflow.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });
Workflow.hasMany(Intercambio, { foreignKey: 'workflowId', as: 'intercambios' });

// Intercambio associations
Intercambio.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });
Intercambio.belongsTo(Entidad, { foreignKey: 'entidadOrigenId', as: 'entidadOrigen' });
Intercambio.belongsTo(Entidad, { foreignKey: 'entidadDestinoId', as: 'entidadDestino' });
Intercambio.belongsTo(Usuario, { foreignKey: 'responsableId', as: 'responsable' });
Intercambio.belongsTo(Usuario, { foreignKey: 'supervisorId', as: 'supervisor' });
Intercambio.belongsTo(Usuario, { foreignKey: 'creadoPor', as: 'creador' });
Intercambio.belongsTo(Usuario, { foreignKey: 'modificadoPor', as: 'modificador' });

// Usuario associations for workflows and intercambios
Usuario.hasMany(Workflow, { foreignKey: 'creadoPor', as: 'workflowsCreados' });
Usuario.hasMany(Workflow, { foreignKey: 'modificadoPor', as: 'workflowsModificados' });
Usuario.hasMany(Intercambio, { foreignKey: 'responsableId', as: 'intercambiosResponsable' });
Usuario.hasMany(Intercambio, { foreignKey: 'supervisorId', as: 'intercambiosSupervisor' });
Usuario.hasMany(Intercambio, { foreignKey: 'creadoPor', as: 'intercambiosCreados' });
Usuario.hasMany(Intercambio, { foreignKey: 'modificadoPor', as: 'intercambiosModificados' });

// Entidad associations for intercambios
Entidad.hasMany(Intercambio, { foreignKey: 'entidadOrigenId', as: 'intercambiosOrigen' });
Entidad.hasMany(Intercambio, { foreignKey: 'entidadDestinoId', as: 'intercambiosDestino' });

// EstadoDocumentoLog associations
EstadoDocumentoLog.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
EstadoDocumentoLog.belongsTo(Documentacion, { foreignKey: 'documentacionId', as: 'documentacion' });
EstadoDocumentoLog.belongsTo(Recurso, { foreignKey: 'recursoId', as: 'recurso' });
EstadoDocumentoLog.belongsTo(Entidad, { foreignKey: 'entidadId', as: 'entidad' });
EstadoDocumentoLog.belongsTo(Estado, { foreignKey: 'estadoAnteriorId', as: 'estadoAnterior' });
EstadoDocumentoLog.belongsTo(Estado, { foreignKey: 'estadoNuevoId', as: 'estadoNuevo' });

// Reverse associations
Usuario.hasMany(EstadoDocumentoLog, { foreignKey: 'usuarioId', as: 'estadoLogs' });
Documentacion.hasMany(EstadoDocumentoLog, { foreignKey: 'documentacionId', as: 'estadoLogs' });
Recurso.hasMany(EstadoDocumentoLog, { foreignKey: 'recursoId', as: 'estadoLogs' });
Entidad.hasMany(EstadoDocumentoLog, { foreignKey: 'entidadId', as: 'estadoLogs' });
Estado.hasMany(EstadoDocumentoLog, { foreignKey: 'estadoAnteriorId', as: 'logsComoAnterior' });
Estado.hasMany(EstadoDocumentoLog, { foreignKey: 'estadoNuevoId', as: 'logsComoNuevo' });

export {
  sequelize,
  Usuario,
  Estado,
  Recurso,
  Documentacion,
  Entidad,
  RecursoDocumentacion,
  EntidadDocumentacion,
  EntidadRecurso,
  Workflow,
  Intercambio,
  EstadoDocumentoLog,
};

export const initializeDatabase = async () => {
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const dbType = usePostgres ? 'PostgreSQL' : 'MySQL';
  
  try {
    await sequelize.authenticate();
    console.log(`Conexión a la base de datos ${dbType} establecida correctamente.`);
    
    // Configuración de sincronización basada en variable de entorno
    const forceReset = process.env.DB_FORCE_RESET === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    // En producción, por defecto NO hacer alter a menos que se especifique explícitamente
    const allowAlter = isProduction 
      ? process.env.DB_ALLOW_ALTER === 'true' 
      : process.env.DB_ALLOW_ALTER !== 'false';
    
    if (forceReset) {
      console.log('⚠️  ADVERTENCIA: DB_FORCE_RESET=true - Recreando base de datos...');
      await sequelize.sync({ force: true });
      console.log('Base de datos recreada completamente.');
    } else if (allowAlter) {
      // Intentar alter solo si está permitido
      try {
        await sequelize.sync({ alter: true });
        console.log('Base de datos sincronizada con alter.');
      } catch (syncError) {
        console.log('Error con alter, intentando sync normal...');
        await sequelize.sync();
        console.log('Base de datos sincronizada sin cambios.');
      }
    } else {
      // Solo sync normal (más seguro para producción)
      await sequelize.sync();
      console.log('Base de datos sincronizada.');
    }
    
    // Crear estados iniciales si no existen (con códigos únicos)
    const estadosIniciales = [
      { nombre: 'En Trámite', codigo: 'EN_TRAMITE', color: '#FFA500', nivel: 2, descripcion: 'Documento en proceso de tramitación' },
      { nombre: 'Vigente', codigo: 'VIGENTE', color: '#00FF00', nivel: 1, descripcion: 'Documento vigente y válido' },
      { nombre: 'Vencido', codigo: 'VENCIDO', color: '#FF0000', nivel: 10, descripcion: 'Documento vencido' },
      { nombre: 'Por Vencer', codigo: 'POR_VENCER', color: '#FFFF00', nivel: 5, descripcion: 'Documento próximo a vencer' },
    ];

    for (const estadoData of estadosIniciales) {
      const [estado] = await Estado.findOrCreate({
        where: { nombre: estadoData.nombre },
        defaults: estadoData,
      });

      // Actualizar código si no existe (para estados existentes sin código)
      if (!estado.codigo) {
        await estado.update({ codigo: estadoData.codigo });
      }
    }
    
    console.log('Estados iniciales creados.');
    
  } catch (error) {
    console.error(`Error al conectar con la base de datos ${dbType}:`, error);
    if (usePostgres) {
      console.error('Verifica que PostgreSQL esté corriendo y que la base de datos "axiomadocs_pg" exista.');
      console.error('Para crear la base de datos: CREATE DATABASE axiomadocs_pg;');
    } else {
      console.error('Verifica que MySQL esté corriendo y que la base de datos "axiomadocs" exista.');
    }
    throw error;
  }
};
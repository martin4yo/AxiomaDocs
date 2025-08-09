import sequelize from './database';
import Usuario from './Usuario';
import Estado from './Estado';
import Recurso from './Recurso';
import Documentacion from './Documentacion';
import Entidad from './Entidad';
import RecursoDocumentacion from './RecursoDocumentacion';
import EntidadDocumentacion from './EntidadDocumentacion';
import EntidadRecurso from './EntidadRecurso';

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
};

export const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos MySQL establecida correctamente.');
    
    // Configuración de sincronización basada en variable de entorno
    const forceReset = process.env.DB_FORCE_RESET === 'true';
    const allowAlter = process.env.DB_ALLOW_ALTER !== 'false'; // true por defecto
    
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
      console.log('Base de datos sincronizada (solo creación de tablas nuevas).');
    }
    
    console.log('Base de datos sincronizada.');
    
    // Crear estados iniciales si no existen
    const estadosIniciales = [
      { nombre: 'En Trámite', color: '#FFA500', nivel: 2, descripcion: 'Documento en proceso de tramitación' },
      { nombre: 'Vigente', color: '#00FF00', nivel: 1, descripcion: 'Documento vigente y válido' },
      { nombre: 'Vencido', color: '#FF0000', nivel: 10, descripcion: 'Documento vencido' },
      { nombre: 'Por Vencer', color: '#FFFF00', nivel: 5, descripcion: 'Documento próximo a vencer' },
    ];
    
    for (const estadoData of estadosIniciales) {
      await Estado.findOrCreate({
        where: { nombre: estadoData.nombre },
        defaults: estadoData,
      });
    }
    
    console.log('Estados iniciales creados.');
    
  } catch (error) {
    console.error('Error al conectar con la base de datos MySQL:', error);
    console.error('Verifica que MySQL esté corriendo y que la base de datos "axiomadocs" exista.');
    throw error;
  }
};
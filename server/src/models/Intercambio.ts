import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

export interface IntercambioAttributes {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  workflowId: number;
  workflowVersion: string;
  entidadOrigenId: number;
  entidadDestinoId: number;
  estado: 'iniciado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  fechaInicio: Date;
  fechaEstimadaFin: Date;
  fechaFinReal?: Date;
  progreso: number;
  pasoActualId?: string;
  contexto: any; // JSONB
  parametrosIniciales: any; // JSONB
  participantesAsignados: any; // JSONB
  documentosRequeridos?: any; // JSONB
  documentosSubidos?: any; // JSONB
  observaciones?: string;
  responsableId: number;
  supervisorId?: number;
  creadoPor: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IntercambioCreationAttributes extends Optional<IntercambioAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Intercambio extends Model<IntercambioAttributes, IntercambioCreationAttributes> implements IntercambioAttributes {
  public id!: number;
  public codigo!: string;
  public nombre!: string;
  public descripcion?: string;
  public workflowId!: number;
  public workflowVersion!: string;
  public entidadOrigenId!: number;
  public entidadDestinoId!: number;
  public estado!: 'iniciado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado';
  public prioridad!: 'baja' | 'media' | 'alta' | 'critica';
  public fechaInicio!: Date;
  public fechaEstimadaFin!: Date;
  public fechaFinReal?: Date;
  public progreso!: number;
  public pasoActualId?: string;
  public contexto!: any;
  public parametrosIniciales!: any;
  public participantesAsignados!: any;
  public documentosRequeridos?: any;
  public documentosSubidos?: any;
  public observaciones?: string;
  public responsableId!: number;
  public supervisorId?: number;
  public creadoPor!: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Intercambio.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [5, 50],
      },
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 255],
      },
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'workflows',
        key: 'id',
      },
    },
    workflowVersion: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    entidadOrigenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'entidades',
        key: 'id',
      },
    },
    entidadDestinoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'entidades',
        key: 'id',
      },
    },
    estado: {
      type: DataTypes.ENUM('iniciado', 'en_progreso', 'completado', 'pausado', 'cancelado'),
      allowNull: false,
      defaultValue: 'iniciado',
    },
    prioridad: {
      type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
      allowNull: false,
      defaultValue: 'media',
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fechaEstimadaFin: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fechaFinReal: {
      type: DataTypes.DATE,
    },
    progreso: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    pasoActualId: {
      type: DataTypes.STRING(50),
    },
    contexto: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    parametrosIniciales: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    participantesAsignados: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    documentosRequeridos: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    documentosSubidos: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    observaciones: {
      type: DataTypes.TEXT,
    },
    responsableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
    supervisorId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
    creadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
    modificadoPor: {
      type: DataTypes.INTEGER,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'intercambios',
    timestamps: true,
    indexes: [
      {
        fields: ['codigo'],
      },
      {
        fields: ['workflowId'],
      },
      {
        fields: ['estado'],
      },
      {
        fields: ['prioridad'],
      },
      {
        fields: ['entidadOrigenId'],
      },
      {
        fields: ['entidadDestinoId'],
      },
      {
        fields: ['responsableId'],
      },
      {
        fields: ['fechaInicio'],
      },
      {
        fields: ['fechaEstimadaFin'],
      },
    ],
    hooks: {
      beforeCreate: (intercambio: Intercambio) => {
        if (!intercambio.codigo) {
          const year = new Date().getFullYear();
          const timestamp = Date.now().toString().slice(-6);
          intercambio.codigo = `INT-${year}-${timestamp}`;
        }
      },
      afterUpdate: (intercambio: Intercambio) => {
        // Si se completó el intercambio, establecer fecha fin real
        if (intercambio.estado === 'completado' && !intercambio.fechaFinReal) {
          intercambio.fechaFinReal = new Date();
        }
      },
    },
  }
);

export default Intercambio;
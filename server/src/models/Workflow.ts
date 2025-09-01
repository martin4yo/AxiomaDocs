import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

export interface WorkflowAttributes {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  version: string;
  categoria: string;
  subcategoria?: string;
  tags?: string[];
  tipo: 'bilateral' | 'supervisado' | 'circular' | 'jerarquico' | 'paralelo';
  participantes: any; // JSONB
  pasos: any; // JSONB
  transiciones: any; // JSONB
  eventos?: any; // JSONB
  complejidad: 'baja' | 'media' | 'alta' | 'critica';
  estimacionDuracionHoras?: number;
  recursosRequeridos?: string[];
  estado: 'borrador' | 'activo' | 'pausado' | 'obsoleto' | 'archivado';
  publicado: boolean;
  utilizaciones: number;
  promedioTiempoComplecion?: number;
  tasaExito?: number;
  fechaPublicacion?: Date;
  fechaUltimaModificacion: Date;
  creadoPor: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkflowCreationAttributes extends Optional<WorkflowAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Workflow extends Model<WorkflowAttributes, WorkflowCreationAttributes> implements WorkflowAttributes {
  public id!: number;
  public codigo!: string;
  public nombre!: string;
  public descripcion?: string;
  public version!: string;
  public categoria!: string;
  public subcategoria?: string;
  public tags?: string[];
  public tipo!: 'bilateral' | 'supervisado' | 'circular' | 'jerarquico' | 'paralelo';
  public participantes!: any;
  public pasos!: any;
  public transiciones!: any;
  public eventos?: any;
  public complejidad!: 'baja' | 'media' | 'alta' | 'critica';
  public estimacionDuracionHoras?: number;
  public recursosRequeridos?: string[];
  public estado!: 'borrador' | 'activo' | 'pausado' | 'obsoleto' | 'archivado';
  public publicado!: boolean;
  public utilizaciones!: number;
  public promedioTiempoComplecion?: number;
  public tasaExito?: number;
  public fechaPublicacion?: Date;
  public fechaUltimaModificacion!: Date;
  public creadoPor!: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Workflow.init(
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
        len: [3, 50],
      },
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 255],
      },
    },
    descripcion: {
      type: DataTypes.TEXT,
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '1.0',
    },
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['Gobierno', 'Salud', 'Legal', 'Educación', 'Comercial', 'Otro']],
      },
    },
    subcategoria: {
      type: DataTypes.STRING(50),
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    tipo: {
      type: DataTypes.ENUM('bilateral', 'supervisado', 'circular', 'jerarquico', 'paralelo'),
      allowNull: false,
    },
    participantes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    pasos: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    transiciones: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    eventos: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    complejidad: {
      type: DataTypes.ENUM('baja', 'media', 'alta', 'critica'),
      allowNull: false,
      defaultValue: 'media',
    },
    estimacionDuracionHoras: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 8760, // 1 año
      },
    },
    recursosRequeridos: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    estado: {
      type: DataTypes.ENUM('borrador', 'activo', 'pausado', 'obsoleto', 'archivado'),
      allowNull: false,
      defaultValue: 'borrador',
    },
    publicado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    utilizaciones: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    promedioTiempoComplecion: {
      type: DataTypes.DECIMAL(8, 2),
      validate: {
        min: 0,
      },
    },
    tasaExito: {
      type: DataTypes.DECIMAL(5, 2),
      validate: {
        min: 0,
        max: 100,
      },
    },
    fechaPublicacion: {
      type: DataTypes.DATE,
    },
    fechaUltimaModificacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    tableName: 'workflows',
    timestamps: true,
    indexes: [
      {
        fields: ['codigo'],
      },
      {
        fields: ['categoria'],
      },
      {
        fields: ['tipo'],
      },
      {
        fields: ['estado'],
      },
      {
        fields: ['creadoPor'],
      },
    ],
    hooks: {
      beforeUpdate: (workflow: Workflow) => {
        workflow.fechaUltimaModificacion = new Date();
      },
    },
  }
);

export default Workflow;
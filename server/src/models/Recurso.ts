import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Usuario from './Usuario';

export interface RecursoAttributes {
  id?: number;
  codigo: string;
  apellido: string;
  nombre: string;
  telefono?: string;
  cuil?: string;
  direccion?: string;
  localidad?: string;
  fechaAlta: Date;
  fechaBaja?: Date;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class Recurso extends Model<RecursoAttributes> implements RecursoAttributes {
  public id!: number;
  public codigo!: string;
  public apellido!: string;
  public nombre!: string;
  public telefono?: string;
  public cuil?: string;
  public direccion?: string;
  public localidad?: string;
  public fechaAlta!: Date;
  public fechaBaja?: Date;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Asociaciones
  public entidadRecurso?: any;
  public recursoDocumentacion?: any;
}

Recurso.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cuil: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  localidad: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fechaAlta: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  fechaBaja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  creadoPor: {
    type: DataTypes.INTEGER,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
  modificadoPor: {
    type: DataTypes.INTEGER,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'Recurso',
  tableName: 'recursos',
});

export default Recurso;
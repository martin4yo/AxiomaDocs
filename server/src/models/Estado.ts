import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Usuario from './Usuario';

export interface EstadoAttributes {
  id?: number;
  nombre: string;
  codigo?: string;
  color: string;
  nivel: number;
  descripcion?: string;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class Estado extends Model<EstadoAttributes> implements EstadoAttributes {
  public id!: number;
  public nombre!: string;
  public codigo?: string;
  public color!: string;
  public nivel!: number;
  public descripcion?: string;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Estado.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Código único del estado para identificación del sistema (VIGENTE, POR_VENCER, VENCIDO, etc)',
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Color hex para indicadores (#FFFFFF)',
  },
  nivel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Nivel de prioridad del estado (mayor número = mayor prioridad)',
  },
  descripcion: {
    type: DataTypes.TEXT,
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
  modelName: 'Estado',
  tableName: 'estados',
});

export default Estado;
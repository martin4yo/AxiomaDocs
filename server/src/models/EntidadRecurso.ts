import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Entidad from './Entidad';
import Recurso from './Recurso';
import Usuario from './Usuario';

export interface EntidadRecursoAttributes {
  id?: number;
  entidadId: number;
  recursoId: number;
  fechaInicio: Date;
  fechaFin?: Date;
  activo: boolean;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class EntidadRecurso extends Model<EntidadRecursoAttributes> implements EntidadRecursoAttributes {
  public id!: number;
  public entidadId!: number;
  public recursoId!: number;
  public fechaInicio!: Date;
  public fechaFin?: Date;
  public activo!: boolean;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EntidadRecurso.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entidadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entidad,
      key: 'id',
    },
  },
  recursoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Recurso,
      key: 'id',
    },
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  fechaFin: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha hasta la cual el recurso estará activo en la entidad',
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  modelName: 'EntidadRecurso',
  tableName: 'entidad_recurso',
});

export default EntidadRecurso;
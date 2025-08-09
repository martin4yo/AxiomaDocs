import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Usuario from './Usuario';

export interface EntidadAttributes {
  id?: number;
  razonSocial: string;
  cuit: string;
  domicilio?: string;
  telefono?: string;
  localidad?: string;
  urlPlataformaDocumentacion?: string;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class Entidad extends Model<EntidadAttributes> implements EntidadAttributes {
  public id!: number;
  public razonSocial!: string;
  public cuit!: string;
  public domicilio?: string;
  public telefono?: string;
  public localidad?: string;
  public urlPlataformaDocumentacion?: string;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Asociaciones
  public entidadRecurso?: any;
  public entidadDocumentacion?: any;
}

Entidad.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  razonSocial: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cuit: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  domicilio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  localidad: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  urlPlataformaDocumentacion: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL de la plataforma de documentación de la entidad',
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
  modelName: 'Entidad',
  tableName: 'entidades',
});

export default Entidad;
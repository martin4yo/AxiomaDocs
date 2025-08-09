import { DataTypes, Model } from 'sequelize';
import sequelize from './database';

export interface UsuarioAttributes {
  id?: number;
  username: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Usuario extends Model<UsuarioAttributes> implements UsuarioAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public nombre!: string;
  public apellido!: string;
  public activo!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Usuario.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'Usuario',
  tableName: 'usuarios',
});

export default Usuario;
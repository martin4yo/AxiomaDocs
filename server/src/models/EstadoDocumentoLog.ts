import { Model, DataTypes } from 'sequelize';
import sequelize from './database';

class EstadoDocumentoLog extends Model {
  public id!: number;
  public tipoDocumento!: 'recurso' | 'entidad';
  public documentacionId!: number;
  public recursoId?: number;
  public entidadId?: number;
  public estadoAnteriorId?: number;
  public estadoNuevoId!: number;
  public razon!: string;
  public fechaActualizacion!: Date;
  public usuarioId?: number;
  public tipoActualizacion!: 'manual' | 'automatica';
  public readonly createdAt!: Date;
}

EstadoDocumentoLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tipoDocumento: {
      type: DataTypes.ENUM('recurso', 'entidad'),
      allowNull: false,
    },
    documentacionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recursoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    entidadId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    estadoAnteriorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    estadoNuevoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    razon: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fechaActualizacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoActualizacion: {
      type: DataTypes.ENUM('manual', 'automatica'),
      allowNull: false,
      defaultValue: 'automatica',
    },
  },
  {
    sequelize,
    modelName: 'EstadoDocumentoLog',
    tableName: 'estado_documento_logs',
    timestamps: true,
    updatedAt: false, // Solo necesitamos createdAt
  }
);

export default EstadoDocumentoLog;
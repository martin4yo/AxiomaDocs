import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Estado from './Estado';
import Usuario from './Usuario';

export interface DocumentacionAttributes {
  id?: number;
  codigo: string;
  descripcion: string;
  diasVigencia: number;
  diasAnticipacion: number;
  esObligatorio: boolean;
  esUniversal: boolean;
  estadoVencimientoId: number;
  estadoId?: number;
  // Campos para documentos universales
  fechaEmision?: Date;
  fechaTramitacion?: Date;
  fechaVencimiento?: Date;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class Documentacion extends Model<DocumentacionAttributes> implements DocumentacionAttributes {
  public id!: number;
  public codigo!: string;
  public descripcion!: string;
  public diasVigencia!: number;
  public diasAnticipacion!: number;
  public esObligatorio!: boolean;
  public esUniversal!: boolean;
  public estadoVencimientoId!: number;
  public estadoId?: number;
  // Campos para documentos universales
  public fechaEmision?: Date;
  public fechaTramitacion?: Date;
  public fechaVencimiento?: Date;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Documentacion.init({
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
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  diasVigencia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Días de vigencia del documento',
  },
  diasAnticipacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Días de anticipación para aviso de vencimiento',
  },
  esObligatorio: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  esUniversal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si el documento tiene fechas universales que no se pueden editar en asignaciones',
  },
  estadoVencimientoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Estado,
      key: 'id',
    },
    comment: 'Estado que indica vencimiento del documento',
  },
  estadoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Estado,
      key: 'id',
    },
    comment: 'Estado del documento universal',
  },
  fechaEmision: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de emisión para documentos universales',
  },
  fechaTramitacion: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de tramitación para documentos universales',
  },
  fechaVencimiento: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de vencimiento calculada: fechaEmision + diasVigencia',
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
  modelName: 'Documentacion',
  tableName: 'documentacion',
});

export default Documentacion;
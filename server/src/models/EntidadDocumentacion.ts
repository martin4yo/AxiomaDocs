import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Entidad from './Entidad';
import Documentacion from './Documentacion';
import Usuario from './Usuario';

export interface EntidadDocumentacionAttributes {
  id?: number;
  entidadId: number;
  documentacionId: number;
  esInhabilitante: boolean;
  enviarPorMail: boolean;
  mailDestino?: string;
  // Campos de fechas específicas por entidad
  fechaEmision?: Date;
  fechaTramitacion?: Date;
  fechaVencimiento?: Date;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class EntidadDocumentacion extends Model<EntidadDocumentacionAttributes> implements EntidadDocumentacionAttributes {
  public id!: number;
  public entidadId!: number;
  public documentacionId!: number;
  public esInhabilitante!: boolean;
  public enviarPorMail!: boolean;
  public mailDestino?: string;
  // Campos de fechas específicas por entidad
  public fechaEmision?: Date;
  public fechaTramitacion?: Date;
  public fechaVencimiento?: Date;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Asociaciones
  public documentacion?: any;
  public entidad?: any;
}

EntidadDocumentacion.init({
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
  documentacionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Documentacion,
      key: 'id',
    },
  },
  esInhabilitante: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si el documento es inhabilitante',
  },
  enviarPorMail: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si se envía por mail',
  },
  mailDestino: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Mail de destino si se envía por correo',
  },
  fechaEmision: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de emisión específica para esta entidad',
  },
  fechaTramitacion: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de tramitación específica para esta entidad',
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
  modelName: 'EntidadDocumentacion',
  tableName: 'entidad_documentacion',
  indexes: [
    {
      unique: true,
      fields: ['entidadId', 'documentacionId'],
    },
  ],
  hooks: {
    beforeSave: async (entidadDoc: EntidadDocumentacion) => {
      // Calcular fecha de vencimiento automáticamente solo si no se estableció manualmente
      if (entidadDoc.fechaEmision && entidadDoc.documentacionId && !entidadDoc.fechaVencimiento) {
        const documentacion = await Documentacion.findByPk(entidadDoc.documentacionId);
        if (documentacion) {
          const fechaEmisionDate = new Date(entidadDoc.fechaEmision);
          entidadDoc.fechaVencimiento = new Date(fechaEmisionDate.getTime() + documentacion.diasVigencia * 24 * 60 * 60 * 1000);
        }
      }
    }
  }
});

export default EntidadDocumentacion;
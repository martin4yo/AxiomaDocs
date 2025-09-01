import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import Recurso from './Recurso';
import Documentacion from './Documentacion';
import Estado from './Estado';
import Usuario from './Usuario';
import { calcularFechaVencimiento } from '../utils/documentHelpers';

export interface RecursoDocumentacionAttributes {
  id?: number;
  recursoId: number;
  documentacionId: number;
  fechaEmision?: Date;
  fechaTramitacion?: Date;
  fechaVencimiento?: Date;
  estadoId?: number;
  observaciones?: string;
  creadoPor?: number;
  modificadoPor?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class RecursoDocumentacion extends Model<RecursoDocumentacionAttributes> implements RecursoDocumentacionAttributes {
  public id!: number;
  public recursoId!: number;
  public documentacionId!: number;
  public fechaEmision?: Date;
  public fechaTramitacion?: Date;
  public fechaVencimiento?: Date;
  public estadoId?: number;
  public observaciones?: string;
  public creadoPor?: number;
  public modificadoPor?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Asociaciones
  public recurso?: any;
  public documentacion?: any;
  public estado?: any;
}

RecursoDocumentacion.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  recursoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Recurso,
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
  fechaEmision: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fechaTramitacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fechaVencimiento: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Se calcula automáticamente: fechaEmision + diasVigencia',
  },
  estadoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Estado,
      key: 'id',
    },
  },
  observaciones: {
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
  modelName: 'RecursoDocumentacion',
  tableName: 'recurso_documentacion',
  indexes: [
    {
      unique: true,
      fields: ['recursoId', 'documentacionId'],
    },
  ],
  hooks: {
    beforeCreate: async (recursoDoc: RecursoDocumentacion) => {
      // Calcular fecha de vencimiento automáticamente si no se proporciona
      if (recursoDoc.fechaEmision && !recursoDoc.fechaVencimiento) {
        try {
          const documentacion = await Documentacion.findByPk(recursoDoc.documentacionId);
          if (documentacion && documentacion.diasVigencia) {
            recursoDoc.fechaVencimiento = calcularFechaVencimiento(recursoDoc.fechaEmision, documentacion.diasVigencia);
          }
        } catch (error) {
          console.error('Error calculando fecha de vencimiento:', error);
        }
      }
    },
    beforeUpdate: async (recursoDoc: RecursoDocumentacion) => {
      // Recalcular fecha de vencimiento si se cambió la fecha de emisión
      if (recursoDoc.changed('fechaEmision') && recursoDoc.fechaEmision) {
        try {
          const documentacion = await Documentacion.findByPk(recursoDoc.documentacionId);
          if (documentacion && documentacion.diasVigencia) {
            recursoDoc.fechaVencimiento = calcularFechaVencimiento(recursoDoc.fechaEmision, documentacion.diasVigencia);
          }
        } catch (error) {
          console.error('Error calculando fecha de vencimiento:', error);
        }
      }
    }
  }
});

export default RecursoDocumentacion;
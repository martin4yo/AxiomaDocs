import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from './database';

export interface DocumentoArchivoAttributes {
  id: number;
  filename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  descripcion?: string;
  version: number;

  // Referencias opcionales (solo una debe estar llena)
  documentacionId?: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;

  creadoPor: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentoArchivoCreationAttributes
  extends Optional<DocumentoArchivoAttributes, 'id' | 'createdAt' | 'updatedAt' | 'version'> {}

class DocumentoArchivo extends Model<DocumentoArchivoAttributes, DocumentoArchivoCreationAttributes>
  implements DocumentoArchivoAttributes {
  public id!: number;
  public filename!: string;
  public storedFilename!: string;
  public mimeType!: string;
  public size!: number;
  public descripcion?: string;
  public version!: number;

  public documentacionId?: number;
  public recursoDocumentacionId?: number;
  public entidadDocumentacionId?: number;

  public creadoPor!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DocumentoArchivo.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre original del archivo',
    },
    storedFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Nombre del archivo en el sistema de almacenamiento',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Tipo MIME del archivo',
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Tamaño del archivo en bytes',
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción opcional del archivo',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Versión del archivo para versionado',
    },
    documentacionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'documentacion',
        key: 'id',
      },
      comment: 'ID de documentación (para documentos universales)',
    },
    recursoDocumentacionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'recurso_documentacion',
        key: 'id',
      },
      comment: 'ID de recurso-documentación (para asignaciones específicas)',
    },
    entidadDocumentacionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'entidad_documentacion',
        key: 'id',
      },
      comment: 'ID de entidad-documentación (para asignaciones específicas)',
    },
    creadoPor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'usuarios',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'DocumentoArchivo',
    tableName: 'documento_archivos',
    timestamps: true,
    indexes: [
      {
        fields: ['documentacionId'],
      },
      {
        fields: ['recursoDocumentacionId'],
      },
      {
        fields: ['entidadDocumentacionId'],
      },
      {
        fields: ['filename', 'version'],
        name: 'filename_version_idx',
      }
    ],
    validate: {
      // Validar que solo una de las tres referencias esté presente
      onlyOneReference() {
        const refs = [this.documentacionId, this.recursoDocumentacionId, this.entidadDocumentacionId];
        const nonNullRefs = refs.filter(ref => ref !== null && ref !== undefined);

        if (nonNullRefs.length !== 1) {
          throw new Error('Debe especificar exactamente una referencia: documentacionId, recursoDocumentacionId o entidadDocumentacionId');
        }
      }
    }
  }
);

export default DocumentoArchivo;
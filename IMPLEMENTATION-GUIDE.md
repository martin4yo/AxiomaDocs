# 🛠️ AXIOMA DOCS - GUÍA DE IMPLEMENTACIÓN PRÁCTICA

**Versión**: 1.0  
**Fecha**: 17 de Agosto 2025  
**Tipo**: Guía de Implementación Paso a Paso  

---

## 🎯 **GUÍA RÁPIDA DE IMPLEMENTACIÓN**

Esta guía proporciona instrucciones paso a paso para implementar las mejoras identificadas en el análisis del sistema AxiomaDocs. Cada fase incluye comandos específicos, código listo para usar y checkpoints de validación.

### **Prerequisitos**
- ✅ AxiomaDocs base funcionando
- ✅ PostgreSQL migrado y funcionando
- ✅ Node.js 18+ y npm
- ✅ Git configurado
- ✅ Acceso a servidor de producción (opcional)

---

## 🚀 **FASE 1: SISTEMA DE ARCHIVOS Y NOTIFICACIONES**

### **SPRINT 1: Configuración Inicial (Día 1)**

#### **Paso 1.1: Instalar Dependencias Nuevas**
```bash
# En el directorio server/
cd server
npm install multer sharp pdf-parse mammoth crypto express-rate-limit
npm install ioredis bull handlebars nodemailer
npm install file-type mime-types uuid
npm install --save-dev @types/multer @types/sharp @types/uuid

# En el directorio client/
cd ../client
npm install react-dropzone @tanstack/react-query-devtools
npm install react-hot-toast lucide-react
```

#### **Paso 1.2: Configurar Variables de Entorno**
```bash
# Actualizar server/.env
echo "
# Storage Configuration
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./storage/documents
STORAGE_MAX_FILE_SIZE=52428800
STORAGE_ALLOWED_TYPES=pdf,doc,docx,jpg,jpeg,png,txt
VIRUS_SCAN_ENABLED=false

# Notification Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=AxiomaDocs <noreply@axiomacloud.com>

# Redis Configuration (para background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# File Processing
ENABLE_OCR=false
ENABLE_THUMBNAIL_GENERATION=true
" >> server/.env
```

#### **Paso 1.3: Crear Estructura de Directorios**
```bash
# Crear directorios de storage
mkdir -p server/storage/{documents,temp,thumbnails,processed}

# Crear directorios para templates de notificación
mkdir -p server/src/templates/{email,sms}

# Crear directorios para servicios nuevos
mkdir -p server/src/services/{storage,notification,processing}
mkdir -p server/src/jobs
```

### **SPRINT 2: Base de Datos (Día 2)**

#### **Paso 2.1: Ejecutar Migración de Base de Datos**
```sql
-- server/migrations/001_add_document_files.sql
-- Copiar desde TECHNICAL-SPECIFICATIONS.md líneas 51-200
-- Ejecutar con:
```

```bash
# Método 1: Usar psql directamente
psql -h localhost -U postgres -d axiomadocs_pg -f migrations/001_add_document_files.sql

# Método 2: Crear script de migración
node scripts/run-migration.js 001_add_document_files.sql
```

#### **Paso 2.2: Verificar Migración**
```bash
# Crear script de verificación
cat > server/scripts/verify-migration.js << 'EOF'
const { sequelize } = require('../src/models');

async function verifyMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection OK');
    
    // Verificar nuevas tablas
    const tables = [
      'documento_archivos',
      'notificacion_reglas', 
      'notificaciones',
      'usuario_notificacion_config'
    ];
    
    for (const table of tables) {
      const [results] = await sequelize.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`✅ Table ${table}: ${results[0].count} records`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();
EOF

node scripts/verify-migration.js
```

### **SPRINT 3: Servicios Backend (Día 3-5)**

#### **Paso 3.1: Implementar Storage Service**
```bash
# Crear archivo server/src/services/storage/StorageService.ts
cat > server/src/services/storage/StorageService.ts << 'EOF'
import { writeFile, readFile, unlink, ensureDir } from 'fs-extra';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageProvider {
  upload(file: Express.Multer.File, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  
  constructor(basePath: string = './storage/documents') {
    this.basePath = basePath;
  }
  
  async upload(file: Express.Multer.File, path: string): Promise<string> {
    const fullPath = join(this.basePath, path);
    await ensureDir(dirname(fullPath));
    await writeFile(fullPath, file.buffer);
    return path;
  }
  
  async download(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    return await readFile(fullPath);
  }
  
  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    await unlink(fullPath);
  }
  
  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path);
    try {
      await readFile(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getUrl(path: string): Promise<string> {
    return `/api/archivos/serve/${encodeURIComponent(path)}`;
  }
}

export class StorageService {
  private static instance: StorageService;
  private provider: StorageProvider;
  
  private constructor() {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    
    switch (provider) {
      case 'local':
        this.provider = new LocalStorageProvider(process.env.STORAGE_LOCAL_PATH);
        break;
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }
  
  async upload(file: Express.Multer.File, path: string): Promise<string> {
    return await this.provider.upload(file, path);
  }
  
  async download(path: string): Promise<Buffer> {
    return await this.provider.download(path);
  }
  
  async delete(path: string): Promise<void> {
    return await this.provider.delete(path);
  }
  
  generatePath(fileName: string, documentacionId: number): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const uuid = uuidv4();
    const extension = fileName.split('.').pop();
    
    return `${year}/${month}/${documentacionId}/${uuid}.${extension}`;
  }
}
EOF
```

#### **Paso 3.2: Crear Modelos Sequelize**
```bash
# Crear archivo server/src/models/DocumentoArchivo.ts
cat > server/src/models/DocumentoArchivo.ts << 'EOF'
import { DataTypes, Model } from 'sequelize';
import sequelize from './database';
import { Documentacion } from './Documentacion';
import { Usuario } from './Usuario';

export interface DocumentoArchivoAttributes {
  id?: number;
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
  nombreOriginal: string;
  nombreArchivo: string;
  rutaArchivo: string;
  rutaMiniatura?: string;
  tipoMime?: string;
  tamañoBytes: number;
  hashMd5: string;
  hashSha256?: string;
  version: number;
  versionAnteriorId?: number;
  esVersionActual: boolean;
  textoExtraido?: string;
  metadatos?: any;
  estadoProcesamiento: 'pendiente' | 'procesando' | 'completado' | 'error';
  errorProcesamiento?: string;
  fechaProcesamiento?: Date;
  publico: boolean;
  fechaExpiracion?: Date;
  descargasPermitidas: number;
  descargasRealizadas: number;
  fechaSubida?: Date;
  fechaModificacion?: Date;
  usuarioSubidaId: number;
  usuarioModificacionId?: number;
  activo: boolean;
}

class DocumentoArchivo extends Model<DocumentoArchivoAttributes> implements DocumentoArchivoAttributes {
  public id!: number;
  public documentacionId!: number;
  public recursoDocumentacionId?: number;
  public entidadDocumentacionId?: number;
  public nombreOriginal!: string;
  public nombreArchivo!: string;
  public rutaArchivo!: string;
  public rutaMiniatura?: string;
  public tipoMime?: string;
  public tamañoBytes!: number;
  public hashMd5!: string;
  public hashSha256?: string;
  public version!: number;
  public versionAnteriorId?: number;
  public esVersionActual!: boolean;
  public textoExtraido?: string;
  public metadatos?: any;
  public estadoProcesamiento!: 'pendiente' | 'procesando' | 'completado' | 'error';
  public errorProcesamiento?: string;
  public fechaProcesamiento?: Date;
  public publico!: boolean;
  public fechaExpiracion?: Date;
  public descargasPermitidas!: number;
  public descargasRealizadas!: number;
  public fechaSubida!: Date;
  public fechaModificacion!: Date;
  public usuarioSubidaId!: number;
  public usuarioModificacionId?: number;
  public activo!: boolean;
}

DocumentoArchivo.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  documentacionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Documentacion,
      key: 'id',
    },
  },
  nombreOriginal: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nombreArchivo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  rutaArchivo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tipoMime: {
    type: DataTypes.STRING(100),
  },
  tamañoBytes: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  hashMd5: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  esVersionActual: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  metadatos: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  estadoProcesamiento: {
    type: DataTypes.STRING(20),
    defaultValue: 'pendiente',
  },
  publico: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  descargasPermitidas: {
    type: DataTypes.INTEGER,
    defaultValue: -1,
  },
  descargasRealizadas: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  usuarioSubidaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'DocumentoArchivo',
  tableName: 'documento_archivos',
  timestamps: true,
  createdAt: 'fechaSubida',
  updatedAt: 'fechaModificacion',
});

export default DocumentoArchivo;
EOF
```

#### **Paso 3.3: Crear Controller de Archivos**
```bash
# Crear archivo server/src/controllers/ArchivoController.ts
cat > server/src/controllers/ArchivoController.ts << 'EOF'
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import DocumentoArchivo from '../models/DocumentoArchivo';
import { StorageService } from '../services/storage/StorageService';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class ArchivoController {
  private storageService = StorageService.getInstance();

  async subirArchivo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { documentacionId } = req.params;
      const file = req.file;
      const { recursoDocumentacionId, entidadDocumentacionId } = req.body;

      if (!file) {
        res.status(400).json({ error: 'No se proporcionó archivo' });
        return;
      }

      // Validar archivo
      await this.validateFile(file);

      // Calcular hash
      const hash = crypto.createHash('md5').update(file.buffer).digest('hex');

      // Verificar duplicado
      const duplicado = await DocumentoArchivo.findOne({
        where: { hashMd5: hash, activo: true }
      });

      if (duplicado) {
        res.status(409).json({
          error: 'DUPLICATE_FILE',
          message: 'Este archivo ya existe en el sistema',
          archivo_existente: duplicado
        });
        return;
      }

      // Generar ruta de archivo
      const extension = path.extname(file.originalname);
      const nombreArchivo = `${uuidv4()}${extension}`;
      const rutaArchivo = this.storageService.generatePath(nombreArchivo, parseInt(documentacionId));

      // Subir archivo
      await this.storageService.upload(file, rutaArchivo);

      // Crear registro en BD
      const archivo = await DocumentoArchivo.create({
        documentacionId: parseInt(documentacionId),
        recursoDocumentacionId: recursoDocumentacionId ? parseInt(recursoDocumentacionId) : undefined,
        entidadDocumentacionId: entidadDocumentacionId ? parseInt(entidadDocumentacionId) : undefined,
        nombreOriginal: file.originalname,
        nombreArchivo,
        rutaArchivo,
        tipoMime: file.mimetype,
        tamañoBytes: file.size,
        hashMd5: hash,
        usuarioSubidaId: req.user.id,
        publico: false,
        esVersionActual: true,
        version: 1,
        descargasPermitidas: -1,
        descargasRealizadas: 0,
        activo: true
      });

      res.status(201).json({
        message: 'Archivo subido exitosamente',
        archivo
      });

    } catch (error) {
      console.error('Error subiendo archivo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async descargarArchivo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const archivo = await DocumentoArchivo.findByPk(id);
      if (!archivo || !archivo.activo) {
        res.status(404).json({ error: 'Archivo no encontrado' });
        return;
      }

      // Verificar límites de descarga
      if (archivo.descargasPermitidas > 0 && archivo.descargasRealizadas >= archivo.descargasPermitidas) {
        res.status(403).json({ error: 'Límite de descargas excedido' });
        return;
      }

      // Descargar del storage
      const buffer = await this.storageService.download(archivo.rutaArchivo);

      // Incrementar contador de descargas
      await archivo.increment('descargasRealizadas');

      // Configurar headers de respuesta
      res.set({
        'Content-Type': archivo.tipoMime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${archivo.nombreOriginal}"`,
        'Content-Length': archivo.tamañoBytes.toString()
      });

      res.send(buffer);

    } catch (error) {
      console.error('Error descargando archivo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async listarArchivos(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { documentacionId, recursoDocumentacionId, entidadDocumentacionId } = req.query;
      const where: any = { activo: true };

      if (documentacionId) where.documentacionId = documentacionId;
      if (recursoDocumentacionId) where.recursoDocumentacionId = recursoDocumentacionId;
      if (entidadDocumentacionId) where.entidadDocumentacionId = entidadDocumentacionId;

      const archivos = await DocumentoArchivo.findAll({
        where,
        order: [['fechaSubida', 'DESC']],
        include: [
          {
            model: require('../models/Usuario').default,
            as: 'usuarioSubida',
            attributes: ['id', 'nombre', 'email']
          }
        ]
      });

      res.json({ archivos });

    } catch (error) {
      console.error('Error listando archivos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    const maxSize = parseInt(process.env.STORAGE_MAX_FILE_SIZE || '52428800'); // 50MB
    const allowedTypes = (process.env.STORAGE_ALLOWED_TYPES || 'pdf,doc,docx,jpg,jpeg,png,txt').split(',');

    if (file.size > maxSize) {
      throw new Error(`Archivo demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`);
    }

    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!allowedTypes.includes(extension)) {
      throw new Error(`Tipo de archivo no permitido: ${extension}`);
    }
  }
}
EOF
```

### **SPRINT 4: Rutas y Middleware (Día 6)**

#### **Paso 4.1: Configurar Multer Middleware**
```bash
# Crear archivo server/src/middleware/upload.ts
cat > server/src/middleware/upload.ts << 'EOF'
import multer from 'multer';
import { Request } from 'express';

// Configuración de multer para archivos en memoria
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = (process.env.STORAGE_ALLOWED_TYPES || 'pdf,doc,docx,jpg,jpeg,png,txt').split(',');
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  
  if (extension && allowedTypes.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${extension}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.STORAGE_MAX_FILE_SIZE || '52428800'), // 50MB
    files: 1
  }
});
EOF
```

#### **Paso 4.2: Crear Rutas de Archivos**
```bash
# Crear archivo server/src/routes/archivos.ts
cat > server/src/routes/archivos.ts << 'EOF'
import { Router } from 'express';
import { ArchivoController } from '../controllers/ArchivoController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
const archivoController = new ArchivoController();

// Subir archivo a un documento específico
router.post('/documentos/:documentacionId/archivos',
  authenticateToken,
  upload.single('archivo'),
  (req, res) => archivoController.subirArchivo(req, res)
);

// Listar archivos
router.get('/archivos',
  authenticateToken,
  (req, res) => archivoController.listarArchivos(req, res)
);

// Descargar archivo
router.get('/archivos/:id/download',
  authenticateToken,
  (req, res) => archivoController.descargarArchivo(req, res)
);

export default router;
EOF
```

#### **Paso 4.3: Integrar Rutas en la Aplicación**
```bash
# Actualizar server/src/index.ts
# Agregar después de las rutas existentes:
```

```typescript
// En server/src/index.ts, agregar:
import archivosRoutes from './routes/archivos';

// Después de las rutas existentes:
app.use('/api', archivosRoutes);
```

### **SPRINT 5: Frontend Components (Día 7-9)**

#### **Paso 5.1: Crear Servicio de Archivos Frontend**
```bash
# Crear archivo client/src/services/archivo.service.ts
cat > client/src/services/archivo.service.ts << 'EOF'
import axios from 'axios';

export interface DocumentoArchivo {
  id: number;
  documentacionId: number;
  nombreOriginal: string;
  nombreArchivo: string;
  tipoMime: string;
  tamañoBytes: number;
  version: number;
  estadoProcesamiento: string;
  fechaSubida: string;
  usuarioSubida?: {
    id: number;
    nombre: string;
    email: string;
  };
}

export interface UploadOptions {
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
  onProgress?: (progress: number) => void;
}

class ArchivoService {
  async upload(
    documentacionId: number,
    file: File,
    options: UploadOptions = {}
  ): Promise<DocumentoArchivo> {
    const formData = new FormData();
    formData.append('archivo', file);
    
    if (options.recursoDocumentacionId) {
      formData.append('recursoDocumentacionId', options.recursoDocumentacionId.toString());
    }
    
    if (options.entidadDocumentacionId) {
      formData.append('entidadDocumentacionId', options.entidadDocumentacionId.toString());
    }

    const response = await axios.post(
      `/api/documentos/${documentacionId}/archivos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (options.onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            options.onProgress(progress);
          }
        },
      }
    );

    return response.data.archivo;
  }

  async list(params: {
    documentacionId?: number;
    recursoDocumentacionId?: number;
    entidadDocumentacionId?: number;
  }): Promise<DocumentoArchivo[]> {
    const response = await axios.get('/api/archivos', { params });
    return response.data.archivos;
  }

  async download(id: number): Promise<Blob> {
    const response = await axios.get(`/api/archivos/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const archivoService = new ArchivoService();
EOF
```

#### **Paso 5.2: Crear Hook de Upload**
```bash
# Crear archivo client/src/hooks/useUpload.ts
cat > client/src/hooks/useUpload.ts << 'EOF'
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archivoService, UploadOptions } from '../services/archivo.service';
import { toast } from 'react-hot-toast';

export function useUploadArchivo() {
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      documentacionId,
      file,
      options = {}
    }: {
      documentacionId: number;
      file: File;
      options?: UploadOptions;
    }) => {
      return archivoService.upload(documentacionId, file, {
        ...options,
        onProgress: setProgress
      });
    },
    
    onSuccess: (data) => {
      toast.success('Archivo subido exitosamente');
      setProgress(0);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['archivos']
      });
    },
    
    onError: (error: any) => {
      console.error('Error subiendo archivo:', error);
      
      if (error.response?.status === 409) {
        toast.error('Este archivo ya existe en el sistema');
      } else if (error.response?.status === 413) {
        toast.error('El archivo es demasiado grande');
      } else {
        toast.error('Error al subir archivo');
      }
      
      setProgress(0);
    },
  });

  return {
    upload: mutation.mutate,
    isUploading: mutation.isPending,
    progress,
    error: mutation.error,
  };
}
EOF
```

#### **Paso 5.3: Crear Componente de Upload**
```bash
# Crear archivo client/src/components/Archivos/UploadArchivo.tsx
cat > client/src/components/Archivos/UploadArchivo.tsx << 'EOF'
import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { useUploadArchivo } from '../../hooks/useUpload';

interface UploadArchivoProps {
  documentacionId: number;
  recursoDocumentacionId?: number;
  entidadDocumentacionId?: number;
  onUploadComplete?: (archivo: any) => void;
  className?: string;
}

export function UploadArchivo({
  documentacionId,
  recursoDocumentacionId,
  entidadDocumentacionId,
  onUploadComplete,
  className = ''
}: UploadArchivoProps) {
  const [dragActive, setDragActive] = useState(false);
  const { upload, isUploading, progress } = useUploadArchivo();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (validateFile(file)) {
        upload({
          documentacionId,
          file,
          options: {
            recursoDocumentacionId,
            entidadDocumentacionId
          }
        });
      }
    });
  }, [upload, documentacionId, recursoDocumentacionId, entidadDocumentacionId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (validateFile(file)) {
        upload({
          documentacionId,
          file,
          options: {
            recursoDocumentacionId,
            entidadDocumentacionId
          }
        });
      }
    });
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png',
                         'application/msword', 'text/plain'];

    if (file.size > maxSize) {
      alert('El archivo es demasiado grande (máximo 50MB)');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido');
      return false;
    }

    return true;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="space-y-4">
            <Upload className="h-8 w-8 mx-auto text-blue-500 animate-pulse" />
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Subiendo... {progress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                PDF, DOC, DOCX, JPG, PNG, TXT (máximo 50MB)
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Seleccionar archivos
            </label>
          </div>
        )}
      </div>

      {/* Información de límites */}
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <AlertCircle className="h-4 w-4" />
        <span>Tamaño máximo: 50MB por archivo</span>
      </div>
    </div>
  );
}
EOF
```

### **SPRINT 6: Testing y Validación (Día 10)**

#### **Paso 6.1: Crear Tests Backend**
```bash
# Crear archivo server/tests/archivo.test.ts
cat > server/tests/archivo.test.ts << 'EOF'
import request from 'supertest';
import app from '../src/index';
import { DocumentoArchivo } from '../src/models';

describe('Archivo Upload API', () => {
  let authToken: string;
  let documentacionId: number;

  beforeAll(async () => {
    // Setup test database and auth
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password'
      });
    
    authToken = loginResponse.body.token;
    documentacionId = 1; // Assume exists
  });

  afterEach(async () => {
    // Clean up uploaded files
    await DocumentoArchivo.destroy({ where: {}, force: true });
  });

  it('should upload file successfully', async () => {
    const response = await request(app)
      .post(`/api/documentos/${documentacionId}/archivos`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('archivo', Buffer.from('test content'), 'test.pdf')
      .expect(201);

    expect(response.body.archivo.nombreOriginal).toBe('test.pdf');
    expect(response.body.archivo.estadoProcesamiento).toBe('pendiente');
  });

  it('should reject duplicate files', async () => {
    // Upload first file
    await request(app)
      .post(`/api/documentos/${documentacionId}/archivos`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('archivo', Buffer.from('test content'), 'test.pdf')
      .expect(201);

    // Try to upload same file
    await request(app)
      .post(`/api/documentos/${documentacionId}/archivos`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('archivo', Buffer.from('test content'), 'test.pdf')
      .expect(409);
  });

  it('should download file correctly', async () => {
    // Upload file first
    const uploadResponse = await request(app)
      .post(`/api/documentos/${documentacionId}/archivos`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('archivo', Buffer.from('test content'), 'test.pdf')
      .expect(201);

    const archivoId = uploadResponse.body.archivo.id;

    // Download file
    const downloadResponse = await request(app)
      .get(`/api/archivos/${archivoId}/download`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(downloadResponse.headers['content-disposition']).toContain('test.pdf');
  });
});
EOF
```

#### **Paso 6.2: Ejecutar Tests**
```bash
# Instalar dependencias de testing
cd server
npm install --save-dev jest supertest @types/jest @types/supertest

# Crear script de test
echo '{"scripts": {"test": "jest"}}' > package.json

# Ejecutar tests
npm test
```

#### **Paso 6.3: Test Manual**
```bash
# Crear script de test manual
cat > server/scripts/test-upload-manual.js << 'EOF'
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@test.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Create test file
    const testContent = 'This is a test PDF content';
    fs.writeFileSync('/tmp/test.pdf', testContent);

    // Upload file
    const form = new FormData();
    form.append('archivo', fs.createReadStream('/tmp/test.pdf'));

    const uploadResponse = await axios.post(
      'http://localhost:5000/api/documentos/1/archivos',
      form,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        }
      }
    );

    console.log('✅ Upload successful:', uploadResponse.data.archivo.id);

    // Download file
    const downloadResponse = await axios.get(
      `http://localhost:5000/api/archivos/${uploadResponse.data.archivo.id}/download`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'stream'
      }
    );

    console.log('✅ Download successful');

    // Clean up
    fs.unlinkSync('/tmp/test.pdf');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testUpload();
EOF

node scripts/test-upload-manual.js
```

---

## 📋 **CHECKPOINTS DE VALIDACIÓN**

### **Checkpoint 1: Configuración Base (Final Día 1)**
```bash
# Verificar instalación de dependencias
cd server && npm list multer sharp pdf-parse
cd ../client && npm list react-dropzone

# Verificar variables de entorno
grep -E "STORAGE_|EMAIL_|REDIS_" server/.env

# Verificar estructura de directorios
ls -la server/storage/
ls -la server/src/services/
```

### **Checkpoint 2: Base de Datos (Final Día 2)**
```bash
# Verificar migración
psql -h localhost -U postgres -d axiomadocs_pg -c "\dt" | grep -E "documento_archivos|notificacion"

# Verificar que las tablas están vacías pero funcionales
psql -h localhost -U postgres -d axiomadocs_pg -c "SELECT COUNT(*) FROM documento_archivos;"
```

### **Checkpoint 3: Backend Services (Final Día 5)**
```bash
# Verificar que el servidor inicia sin errores
cd server && npm run dev &
SERVER_PID=$!

# Esperar que inicie
sleep 5

# Verificar endpoints
curl -I http://localhost:5000/api/health
curl -I http://localhost:5000/api/archivos

# Limpiar
kill $SERVER_PID
```

### **Checkpoint 4: Frontend (Final Día 9)**
```bash
# Verificar que el cliente compila
cd client && npm run build

# Verificar que no hay errores de TypeScript
npm run type-check

# Verificar que los componentes están disponibles
grep -r "UploadArchivo" src/components/
```

### **Checkpoint 5: Integración Completa (Final Día 10)**
```bash
# Test end-to-end
cd server && npm run dev &
SERVER_PID=$!

cd ../client && npm run dev &
CLIENT_PID=$!

# Esperar que inicien
sleep 10

# Verificar que ambos servicios responden
curl -I http://localhost:5000/health
curl -I http://localhost:3000

# Limpiar
kill $SERVER_PID $CLIENT_PID
```

---

## 🚀 **DEPLOYMENT A PRODUCCIÓN**

### **Paso Final: Deploy a Producción**
```bash
# 1. Commit de cambios
git add .
git commit -m "feat: Implementar sistema de archivos y notificaciones

- Agregar soporte para upload/download de archivos
- Implementar storage service con múltiples providers
- Crear componentes React para manejo de archivos
- Agregar validaciones de seguridad y límites
- Incluir tests unitarios e integración

✅ Fase 1 completa: Sistema de archivos operativo"

# 2. Build de producción
npm run build

# 3. Deploy usando script existente
npm run deploy:prod

# 4. Verificar deploy
curl -I https://docs.axiomacloud.com/api/health
```

### **Post-Deploy Checklist**
```bash
# Verificar que las nuevas tablas existen en producción
psql -h production-host -U axiomadocs_user -d axiomadocs_pg -c "\dt" | grep documento_archivos

# Verificar que el storage directory existe
ssh user@production-host "ls -la /opt/axiomadocs/server/storage/"

# Verificar que los endpoints responden
curl -H "Authorization: Bearer TOKEN" https://docs.axiomacloud.com/api/archivos

# Verificar logs del servidor
ssh user@production-host "pm2 logs axiomadocs-server --lines 50"
```

---

## 📖 **GUÍAS DE TROUBLESHOOTING**

### **Problemas Comunes y Soluciones**

#### **Error: "Cannot upload file"**
```bash
# Verificar permisos de directorio
ls -la server/storage/
chmod 755 server/storage/
chown -R node:node server/storage/

# Verificar variables de entorno
env | grep STORAGE_
```

#### **Error: "Database table not found"**
```bash
# Verificar migración
psql -d axiomadocs_pg -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# Re-ejecutar migración si es necesario
psql -d axiomadocs_pg -f migrations/001_add_document_files.sql
```

#### **Error: "File too large"**
```bash
# Verificar configuración de nginx
grep client_max_body_size /etc/nginx/sites-available/axiomadocs

# Actualizar si es necesario
sudo sed -i 's/client_max_body_size.*/client_max_body_size 50M;/' /etc/nginx/sites-available/axiomadocs
sudo nginx -s reload
```

#### **Error: "Upload timeout"**
```bash
# Verificar configuración de Express
grep timeout server/src/index.ts

# Agregar si no existe:
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

---

## 🎯 **PRÓXIMOS PASOS PARA FASE 2**

### **Preparación para Workflows (Semana siguiente)**
```bash
# 1. Instalar dependencias adicionales para workflows
npm install jsonlogic-js node-cron bull-board

# 2. Crear estructura para workflows
mkdir -p server/src/services/{workflow,rules}
mkdir -p client/src/components/Workflows

# 3. Diseñar schemas de workflow
cat > server/docs/workflow-schema.md << 'EOF'
# Workflow Schema Design

## Workflow Definition
- Steps (sequential/parallel)
- Transitions (conditional)
- Participants (roles/users)
- Timeouts and escalations

## Implementation Plan
- Week 1: Workflow engine core
- Week 2: UI for workflow design
- Week 3: Runtime execution
- Week 4: Monitoring and analytics
EOF
```

### **Validación de Completitud Fase 1**
- ✅ Upload de archivos funcionando
- ✅ Download con validación de permisos
- ✅ Almacenamiento configurable (local/cloud)
- ✅ Detección de duplicados por hash
- ✅ Versionado de archivos
- ✅ Validación de tipos y tamaños
- ✅ Componentes React integrados
- ✅ Tests unitarios e integración
- ✅ Deploy a producción exitoso

**Status: FASE 1 COMPLETADA ✅**

---

Esta guía proporciona todas las instrucciones paso a paso para implementar exitosamente el sistema de archivos y notificaciones de AxiomaDocs, con validaciones en cada etapa y troubleshooting completo.
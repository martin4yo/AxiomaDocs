import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Extensiones permitidas (como validación adicional)
const ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'
];

// Tamaño máximo de archivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes

// Crear directorio si no existe
const createUploadDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configuración de storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Determinar el directorio basado en la URL
    let uploadPath = 'uploads/';

    if (req.path.includes('/documentacion/')) {
      uploadPath += 'documentacion/';
    } else if (req.path.includes('/recurso-documentacion/')) {
      uploadPath += 'recurso-documentacion/';
    } else if (req.path.includes('/entidad-documentacion/')) {
      uploadPath += 'entidad-documentacion/';
    }

    // Agregar ID específico del endpoint
    const id = req.params.id;
    if (id) {
      uploadPath += `${id}/`;
    }

    createUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Sanitizar nombre de archivo
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .substring(0, 50); // Limitar longitud

    // Generar nombre único con timestamp
    const timestamp = Date.now();
    const uniqueName = `${baseName}_${timestamp}${extension}`;

    cb(null, uniqueName);
  }
});

// Filtro de archivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX`));
  }

  // Validar extensión
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(new Error(`Extensión de archivo no permitida: ${extension}`));
  }

  cb(null, true);
};

// Configuración de multer
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 20 // Máximo 20 archivos por upload
  }
});

// Middleware para uploads múltiples
export const uploadMultiple = uploadMiddleware.array('files', 20);

// Middleware para upload único
export const uploadSingle = uploadMiddleware.single('archivo');

// Función para validar archivo después del upload
export const validateUploadedFile = (file: Express.Multer.File) => {
  if (!file) {
    throw new Error('No se proporcionó archivo');
  }

  // Validar que el archivo se haya guardado correctamente
  if (!fs.existsSync(file.path)) {
    throw new Error('Error al guardar archivo');
  }

  // Validar tamaño real del archivo
  const stats = fs.statSync(file.path);
  if (stats.size > MAX_FILE_SIZE) {
    // Eliminar archivo si excede el tamaño
    fs.unlinkSync(file.path);
    throw new Error(`Archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }

  return true;
};

// Función para eliminar archivo del sistema
export const deleteFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return false;
  }
};

// Función para obtener información del archivo
export const getFileInfo = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        modified: stats.mtime
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error obteniendo info del archivo:', error);
    return { exists: false };
  }
};
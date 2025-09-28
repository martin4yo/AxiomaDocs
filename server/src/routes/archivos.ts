import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';
import {
  uploadArchivos,
  getDocumentacionArchivos,
  getRecursoDocumentacionArchivos,
  getEntidadDocumentacionArchivos,
  downloadArchivo,
  deleteArchivo
} from '../controllers/archivoController';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Upload archivos
router.post('/documentacion/:id/upload', uploadMultiple, uploadArchivos);
router.post('/recurso-documentacion/:id/upload', uploadMultiple, uploadArchivos);
router.post('/entidad-documentacion/:id/upload', uploadMultiple, uploadArchivos);

// Obtener archivos
router.get('/documentacion/:id', getDocumentacionArchivos);
router.get('/recurso-documentacion/:id', getRecursoDocumentacionArchivos);
router.get('/entidad-documentacion/:id', getEntidadDocumentacionArchivos);

// Operaciones sobre archivos individuales
router.get('/:archivoId/download', downloadArchivo);
router.delete('/:archivoId', deleteArchivo);

export default router;
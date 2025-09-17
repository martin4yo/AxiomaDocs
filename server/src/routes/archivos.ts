import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';
import {
  uploadDocumentacionArchivos,
  uploadRecursoDocumentacionArchivos,
  uploadEntidadDocumentacionArchivos,
  getDocumentacionArchivos,
  getRecursoDocumentacionArchivos,
  getEntidadDocumentacionArchivos,
  downloadArchivo,
  updateArchivo,
  deleteArchivo
} from '../controllers/archivoController';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Upload archivos
router.post('/documentacion/:id/upload', uploadMultiple, uploadDocumentacionArchivos);
router.post('/recurso-documentacion/:id/upload', uploadMultiple, uploadRecursoDocumentacionArchivos);
router.post('/entidad-documentacion/:id/upload', uploadMultiple, uploadEntidadDocumentacionArchivos);

// Obtener archivos
router.get('/documentacion/:id', getDocumentacionArchivos);
router.get('/recurso-documentacion/:id', getRecursoDocumentacionArchivos);
router.get('/entidad-documentacion/:id', getEntidadDocumentacionArchivos);

// Operaciones sobre archivos individuales
router.get('/:archivoId/download', downloadArchivo);
router.put('/:archivoId', updateArchivo);
router.delete('/:archivoId', deleteArchivo);

export default router;
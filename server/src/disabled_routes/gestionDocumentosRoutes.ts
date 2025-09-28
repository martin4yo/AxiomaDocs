import express from 'express';
import {
  getAsignacionesDocumentos,
  updateAsignacionDocumento,
  getEstadisticasGestion
} from '../controllers/gestionDocumentosController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Obtener todas las asignaciones de documentos con filtros
router.get('/', authenticateToken, getAsignacionesDocumentos);

// Actualizar una asignación de documento (fechas, estado)
router.put('/:tipo/:id', authenticateToken, updateAsignacionDocumento);

// Estadísticas para el dashboard de gestión
router.get('/estadisticas', authenticateToken, getEstadisticasGestion);

export default router;
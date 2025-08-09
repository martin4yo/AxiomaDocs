import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getDocumentacionPorEstado,
  getRecursosPorEntidad,
  getDocumentosProximosAVencer
} from '../controllers/reportesController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/reportes/documentacion-por-estado - Reporte de documentación agrupada por estado
router.get('/documentacion-por-estado', getDocumentacionPorEstado);

// GET /api/reportes/recursos-por-entidad - Reporte de recursos por entidad con estado de documentación
router.get('/recursos-por-entidad', getRecursosPorEntidad);

// GET /api/reportes/documentos-proximos-vencer - Reporte de documentos próximos a vencer
router.get('/documentos-proximos-vencer', getDocumentosProximosAVencer);

export default router;
import { Router } from 'express';
import {
  getEstadisticas,
  getPorDocumento,
  getPorEntidad,
  cambiarEstado,
  getEventos,
  getAdjuntos,
  subirAdjunto
} from '../controllers/seguimientoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/seguimiento/stats - Estadísticas generales
router.get('/stats', getEstadisticas);

// GET /api/seguimiento/por-documento - Vista agrupada por documento
router.get('/por-documento', getPorDocumento);

// GET /api/seguimiento/por-entidad - Vista agrupada por entidad
router.get('/por-entidad', getPorEntidad);

// PUT /api/seguimiento/cambiar-estado/:documentoId/:entidadId - Cambiar estado de envío
router.put('/cambiar-estado/:documentoId/:entidadId', cambiarEstado);

// GET /api/seguimiento/eventos/:documentoId/:entidadId/:recursoId? - Obtener eventos del documento
router.get('/eventos/:documentoId/:entidadId/:recursoId?', getEventos);

// GET /api/seguimiento/adjuntos/:documentoId/:entidadId/:recursoId? - Obtener adjuntos del documento
router.get('/adjuntos/:documentoId/:entidadId/:recursoId?', getAdjuntos);

// POST /api/seguimiento/subir-adjunto - Subir adjunto
router.post('/subir-adjunto', subirAdjunto);

export default router;
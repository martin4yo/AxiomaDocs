import { Router } from 'express';
import {
  getEstadisticasSeguimiento,
  getSeguimientoPorDocumento,
  getSeguimientoPorEntidad,
  cambiarEstadoEnvio,
  getEventosDocumento,
  crearEvento,
  getAdjuntosDocumento,
  descargarAdjunto,
  descargarAdjuntosMasivo
} from '../controllers/seguimientoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/seguimiento/stats - Estadísticas generales
router.get('/stats', getEstadisticasSeguimiento);

// GET /api/seguimiento/por-documento - Vista agrupada por documento
router.get('/por-documento', getSeguimientoPorDocumento);

// GET /api/seguimiento/por-entidad - Vista agrupada por entidad
router.get('/por-entidad', getSeguimientoPorEntidad);

// PUT /api/seguimiento/cambiar-estado/:documentoId/:entidadId - Cambiar estado de envío
router.put('/cambiar-estado/:documentoId/:entidadId', cambiarEstadoEnvio);

// GET /api/seguimiento/eventos/:documentoId/:entidadId - Obtener eventos del documento
router.get('/eventos/:documentoId/:entidadId', getEventosDocumento);

// POST /api/seguimiento/eventos/:documentoId/:entidadId - Crear nuevo evento
router.post('/eventos/:documentoId/:entidadId', crearEvento);

// GET /api/seguimiento/adjuntos/:documentoId/:entidadId - Obtener adjuntos del documento
router.get('/adjuntos/:documentoId/:entidadId', getAdjuntosDocumento);

// GET /api/seguimiento/adjuntos/:documentoId/:entidadId/descargar/:adjuntoId - Descargar adjunto individual
router.get('/adjuntos/:documentoId/:entidadId/descargar/:adjuntoId', descargarAdjunto);

// GET /api/seguimiento/adjuntos/:documentoId/:entidadId/descargar-todos - Descarga masiva de adjuntos
router.get('/adjuntos/:documentoId/:entidadId/descargar-todos', descargarAdjuntosMasivo);

export default router;
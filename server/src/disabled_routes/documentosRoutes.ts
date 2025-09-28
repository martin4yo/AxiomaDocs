import express from 'express';
import {
  getDocumentosConEstadoCritico,
  getRecursosAsignados,
  getEntidadesDestino,
  updateRecursoAsignado,
  updateEntidadAsignada,
  updateEstadoEnvio,
  updateDocumentoUniversal,
  getEstadisticasDashboard
} from '../controllers/documentosController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/documentos/stats - Estadísticas del dashboard
router.get('/stats', getEstadisticasDashboard);

// GET /api/documentos - Lista principal de documentos con estado crítico
router.get('/', getDocumentosConEstadoCritico);

// GET /api/documentos/:id/recursos - Sub-grilla de recursos asignados a un documento
router.get('/:id/recursos', getRecursosAsignados);

// GET /api/documentos/:id/entidades - Sub-grilla de entidades destino de un documento
router.get('/:id/entidades', getEntidadesDestino);

// PUT /api/documentos/:documentoId/recursos/:recursoAsignacionId - Actualizar recurso asignado
router.put('/:documentoId/recursos/:recursoAsignacionId', updateRecursoAsignado);

// PUT /api/documentos/:documentoId/entidades/:entidadAsignacionId/asignacion - Actualizar asignación de entidad
router.put('/:documentoId/entidades/:entidadAsignacionId/asignacion', updateEntidadAsignada);

// PUT /api/documentos/:documentoId/entidades/:entidadId/envio - Actualizar estado de envío
router.put('/:documentoId/entidades/:entidadId/envio', updateEstadoEnvio);

// PUT /api/documentos/:id/universal - Actualizar documento universal
router.put('/:id/universal', updateDocumentoUniversal);

export default router;
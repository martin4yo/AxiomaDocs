import { Router } from 'express';
import estadoDocumentosController from '../controllers/estadoDocumentosController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Ejecutar actualización manual de estados
router.post('/actualizar', estadoDocumentosController.actualizarEstados);

// Obtener estadísticas de estados
router.get('/estadisticas', estadoDocumentosController.obtenerEstadisticas);

// Obtener información de la última actualización
router.get('/ultima-actualizacion', estadoDocumentosController.obtenerUltimaActualizacion);

// Obtener logs de auditoría
router.get('/logs', estadoDocumentosController.obtenerLogs);

export default router;
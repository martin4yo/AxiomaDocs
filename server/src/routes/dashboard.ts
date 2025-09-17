import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getStats, getDocumentosPorVencer, getDocumentosVencidos, getActividadReciente } from '../controllers/dashboardController';

const router = Router();

router.get('/stats', authenticateToken, getStats);
router.get('/documentos-por-vencer', authenticateToken, getDocumentosPorVencer);
router.get('/documentos-vencidos', authenticateToken, getDocumentosVencidos); // Nueva ruta para documentos vencidos
router.get('/actividad-reciente', authenticateToken, getActividadReciente);

export default router;

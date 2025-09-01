import express from 'express';
import { workflowController } from '../controllers/workflowController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/workflows - Listar workflows con filtros y paginación
router.get('/', workflowController.listar);

// GET /api/workflows/estadisticas - Obtener estadísticas de workflows
router.get('/estadisticas', workflowController.obtenerEstadisticas);

// GET /api/workflows/templates - Obtener templates disponibles
router.get('/templates', workflowController.obtenerTemplates);

// GET /api/workflows/:id - Obtener workflow por ID
router.get('/:id', workflowController.obtenerPorId);

// POST /api/workflows - Crear nuevo workflow
router.post('/', workflowController.crear);

// POST /api/workflows/:id/duplicar - Duplicar workflow existente
router.post('/:id/duplicar', workflowController.duplicar);

// PUT /api/workflows/:id - Actualizar workflow
router.put('/:id', workflowController.actualizar);

// DELETE /api/workflows/:id - Eliminar workflow
router.delete('/:id', workflowController.eliminar);

export default router;
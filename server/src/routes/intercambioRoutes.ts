import express from 'express';
import { intercambioController } from '../controllers/intercambioController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/intercambios - Listar intercambios con filtros y paginación
router.get('/', intercambioController.listar);

// GET /api/intercambios/estadisticas - Obtener estadísticas de intercambios
router.get('/estadisticas', intercambioController.obtenerEstadisticas);

// GET /api/intercambios/:id - Obtener intercambio por ID
router.get('/:id', intercambioController.obtenerPorId);

// POST /api/intercambios - Crear nuevo intercambio
router.post('/', intercambioController.crear);

// PUT /api/intercambios/:id - Actualizar intercambio
router.put('/:id', intercambioController.actualizar);

// DELETE /api/intercambios/:id - Eliminar intercambio
router.delete('/:id', intercambioController.eliminar);

export default router;
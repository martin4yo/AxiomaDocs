import express from 'express';
import {
  getEventos,
  createEvento,
  updateEvento,
  deleteEvento,
  getEventoById
} from '../controllers/eventosController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/eventos?documentacionId=X&recursoDocumentacionId=Y&entidadDocumentacionId=Z
router.get('/', getEventos);

// GET /api/eventos/:id - Obtener un evento específico
router.get('/:id', getEventoById);

// POST /api/eventos - Crear nuevo evento
router.post('/', createEvento);

// PUT /api/eventos/:id - Actualizar evento
router.put('/:id', updateEvento);

// DELETE /api/eventos/:id - Eliminar evento
router.delete('/:id', deleteEvento);

export default router;
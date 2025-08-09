import { Router } from 'express';
import {
  getEstados,
  getEstado,
  createEstado,
  updateEstado,
  deleteEstado,
} from '../controllers/estadoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getEstados);
router.get('/:id', getEstado);
router.post('/', createEstado);
router.put('/:id', updateEstado);
router.delete('/:id', deleteEstado);

export default router;
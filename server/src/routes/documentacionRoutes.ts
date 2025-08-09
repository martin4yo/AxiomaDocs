import { Router } from 'express';
import {
  getDocumentacion,
  getDocumentacionById,
  createDocumentacion,
  updateDocumentacion,
  deleteDocumentacion,
  addRecursoToDocumentacion,
} from '../controllers/documentacionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getDocumentacion);
router.get('/:id', getDocumentacionById);
router.post('/', createDocumentacion);
router.put('/:id', updateDocumentacion);
router.delete('/:id', deleteDocumentacion);
router.post('/:id/recursos', addRecursoToDocumentacion);

export default router;
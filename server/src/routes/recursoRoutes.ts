import { Router } from 'express';
import {
  getRecursos,
  getRecurso,
  createRecurso,
  updateRecurso,
  deleteRecurso,
  addDocumentToRecurso,
  updateRecursoDocumentacion,
  removeDocumentFromRecurso,
} from '../controllers/recursoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getRecursos);
router.get('/:id', getRecurso);
router.post('/', createRecurso);
router.put('/:id', updateRecurso);
router.delete('/:id', deleteRecurso);
router.post('/:id/documentos', addDocumentToRecurso);
router.put('/documentos/:recursoDocId', updateRecursoDocumentacion);
router.delete('/documentos/:recursoDocId', removeDocumentFromRecurso);

export default router;
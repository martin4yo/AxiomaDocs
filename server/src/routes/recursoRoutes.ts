import { Router } from 'express';
import {
  getRecursos,
  getRecurso,
  createRecurso,
  updateRecurso,
  deleteRecurso,
  getRecursoDocumentacion,
  assignDocumentacionToRecurso,
  updateRecursoDocumentacion,
  deleteRecursoDocumentacion,
} from '../controllers/recursoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getRecursos);
router.get('/:id', getRecurso);
router.post('/', createRecurso);
router.put('/:id', updateRecurso);
router.delete('/:id', deleteRecurso);

// Documentación de recursos
router.get('/:id/documentacion', getRecursoDocumentacion);
router.post('/:recursoId/documentacion/:documentacionId', assignDocumentacionToRecurso);
router.put('/documentacion/:id', updateRecursoDocumentacion);
router.delete('/documentacion/:id', deleteRecursoDocumentacion);

export default router;
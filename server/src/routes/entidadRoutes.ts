import { Router } from 'express';
import {
  getEntidades,
  getEntidad,
  createEntidad,
  updateEntidad,
  deleteEntidad,
  addDocumentacionToEntidad,
  updateEntidadDocumentacion,
  removeDocumentacionFromEntidad,
  addRecursoToEntidad,
  updateEntidadRecurso,
  removeRecursoFromEntidad,
} from '../controllers/entidadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getEntidades);
router.get('/:id', getEntidad);
router.post('/', createEntidad);
router.put('/:id', updateEntidad);
router.delete('/:id', deleteEntidad);
router.post('/:id/documentacion', addDocumentacionToEntidad);
router.put('/documentacion/:entidadDocId', updateEntidadDocumentacion);
router.delete('/documentacion/:entidadDocId', removeDocumentacionFromEntidad);
router.post('/:id/recursos', addRecursoToEntidad);
router.put('/recursos/:entidadRecursoId', updateEntidadRecurso);
router.delete('/recursos/:entidadRecursoId', removeRecursoFromEntidad);

export default router;
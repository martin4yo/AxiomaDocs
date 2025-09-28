import { Router } from 'express';
import {
  getEntidades,
  getEntidad,
  createEntidad,
  updateEntidad,
  deleteEntidad,
  getEntidadDocumentacion,
  assignDocumentacionToEntidad,
  updateEntidadDocumentacion,
  deleteEntidadDocumentacion,
  getEntidadRecursos,
  assignRecursoToEntidad,
  updateEntidadRecurso,
  deleteEntidadRecurso,
} from '../controllers/entidadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getEntidades);
router.get('/:id', getEntidad);
router.post('/', createEntidad);
router.put('/:id', updateEntidad);
router.delete('/:id', deleteEntidad);

// Documentación de entidades
router.get('/:id/documentacion', getEntidadDocumentacion);
router.post('/:entidadId/documentacion/:documentacionId', assignDocumentacionToEntidad);
router.put('/documentacion/:id', updateEntidadDocumentacion);
router.delete('/documentacion/:id', deleteEntidadDocumentacion);

// Recursos de entidades
router.get('/:id/recursos', getEntidadRecursos);
router.post('/:entidadId/recursos/:recursoId', assignRecursoToEntidad);
router.put('/recursos/:id', updateEntidadRecurso);
router.delete('/recursos/:id', deleteEntidadRecurso);

export default router;
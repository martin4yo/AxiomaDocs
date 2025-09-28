import { Router } from 'express';
import {
  getDocumentacion,
  getDocumento,
  createDocumentacion,
  updateDocumentacion,
  deleteDocumentacion,
  getDocumentacionRecursos,
  getDocumentacionEntidades,
} from '../controllers/documentacionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getDocumentacion);
router.get('/:id', getDocumento);
router.post('/', createDocumentacion);
router.put('/:id', updateDocumentacion);
router.delete('/:id', deleteDocumentacion);

// Recursos y entidades asignados a documentación
router.get('/:id/recursos', getDocumentacionRecursos);
router.get('/:id/entidades', getDocumentacionEntidades);

export default router;
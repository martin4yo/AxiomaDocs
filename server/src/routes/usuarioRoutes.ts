import { Router } from 'express';
import {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  changePassword,
  getUsuarioStats
} from '../controllers/usuarioController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas CRUD básicas
router.get('/', getUsuarios);
router.get('/:id', getUsuario);
router.post('/', createUsuario);
router.put('/:id', updateUsuario);
router.delete('/:id', deleteUsuario);

// Rutas especiales
router.get('/stats/overview', getUsuarioStats);
router.post('/:id/change-password', changePassword);

export default router;
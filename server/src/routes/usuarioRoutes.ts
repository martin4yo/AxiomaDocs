import { Router } from 'express';
import {
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  toggleUsuarioStatus,
  changeOwnPassword
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
router.patch('/:id/toggle-status', toggleUsuarioStatus);
router.post('/change-password', changeOwnPassword);

export default router;
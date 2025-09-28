import { Router } from 'express';
import { register, login, getProfile, forgotPassword, verifyResetToken, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas de autenticación básica
router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);

// Rutas de recuperación de contraseña
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

export default router;
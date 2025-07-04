import { Router } from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', validateRegistration, register);

// POST /api/auth/login
router.post('/login', validateLogin, login);

// GET /api/auth/profile
router.get('/profile', authenticateToken, getProfile);

// PUT /api/auth/profile
router.put('/profile', authenticateToken, updateProfile);

export default router;

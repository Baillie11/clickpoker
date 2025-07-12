import { Router } from 'express';
import { register, login, getProfile, updateProfile, forgotPassword, verifyResetToken, resetPassword, uploadProfileImage } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Set up multer storage for profile images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/profile-images');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const userId = (req as any).user?.userId || 'unknown';
    cb(null, `${userId}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// POST /api/auth/register
router.post('/register', validateRegistration, register);

// POST /api/auth/login
router.post('/login', validateLogin, login);

// GET /api/auth/profile
router.get('/profile', authenticateToken, getProfile);

// PUT /api/auth/profile
router.put('/profile', authenticateToken, updateProfile);

// POST /api/auth/upload-profile-image
router.post('/upload-profile-image', authenticateToken, upload.single('image'), uploadProfileImage);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password/:token', resetPassword);

export default router;

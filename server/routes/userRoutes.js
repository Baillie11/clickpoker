import express from 'express';
import { getProfile, updateProfile, toggleTrainingMode } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', protect, getProfile);
router.put('/update', protect, updateProfile);
router.post('/training-toggle', protect, toggleTrainingMode); // ✅ this line

export default router;

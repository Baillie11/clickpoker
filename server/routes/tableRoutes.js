import express from 'express';
import { joinTable } from '../controllers/tableController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/join', protect, joinTable);

export default router;

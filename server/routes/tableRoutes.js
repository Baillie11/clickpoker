import express from 'express';
import { joinTable } from '../controllers/tableController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getTableState } from '../controllers/tableController.js';

const router = express.Router();

router.get('/state', protect, getTableState);

router.post('/join', protect, joinTable);

export default router;

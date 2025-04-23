import express from 'express';
import {
    createTournament,
    getTournaments,
    getTournamentStatus,
    calculatePayouts
  } from '../controllers/tournamentController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createTournament);
router.get('/', protect, getTournaments);
router.get('/:id/status', protect, getTournamentStatus);
router.get('/:id/payouts', protect, calculatePayouts);


export default router;

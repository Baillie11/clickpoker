import Tournament from '../models/Tournament.js';

// ✅ Create tournament
export const createTournament = async (req, res) => {
  try {
    const { name, blinds, payouts } = req.body;

    const tournament = new Tournament({
      name,
      createdBy: req.user.id,
      blinds,
      payouts
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to create tournament', error: err.message });
  }
};

// ✅ Get all tournaments
export const getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find().populate('createdBy', 'username');
    res.status(200).json(tournaments);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching tournaments', error: err.message });
  }
};

// ✅ PHASE 3A: Get current status of a tournament
export const getTournamentStatus = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ msg: 'Tournament not found' });

    const now = new Date();
    const createdAt = new Date(tournament.createdAt);
    const elapsedMinutes = Math.floor((now - createdAt) / 60000);

    let currentRound = 1;
    let timeRemaining = 0;
    let totalTime = 0;

    for (let i = 0; i < tournament.blinds.length; i++) {
      totalTime += tournament.blinds[i].durationMinutes;
      if (elapsedMinutes < totalTime) {
        currentRound = tournament.blinds[i].round;
        timeRemaining = totalTime - elapsedMinutes;
        break;
      }
    }

    const currentBlind = tournament.blinds.find(b => b.round === currentRound);
    const nextBlind = tournament.blinds.find(b => b.round === currentRound + 1) || null;

    res.status(200).json({
      tournamentId: tournament._id,
      name: tournament.name,
      currentRound,
      timeRemainingMinutes: timeRemaining,
      currentBlind,
      nextBlind
    });

  } catch (err) {
    res.status(500).json({ msg: 'Failed to get status', error: err.message });
  }
};

// ✅ PHASE 3B — Payout calculator
export const calculatePayouts = async (req, res) => {
  try {
    const { id } = req.params;
    const entries = parseInt(req.query.entries);
    const buyin = parseFloat(req.query.buyin);

    if (!entries || !buyin) {
      return res.status(400).json({ msg: 'Entries and buyin are required' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ msg: 'Tournament not found' });

    const prizePool = entries * buyin;

    const calculated = tournament.payouts.map(p => ({
      place: p.place,
      percentage: p.percentage,
      amount: parseFloat(((p.percentage / 100) * prizePool).toFixed(2))
    }));

    res.status(200).json({
      tournamentId: id,
      entries,
      buyin,
      prizePool,
      payouts: calculated
    });

  } catch (err) {
    res.status(500).json({ msg: 'Failed to calculate payouts', error: err.message });
  }
};


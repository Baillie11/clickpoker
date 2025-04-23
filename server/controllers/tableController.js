import Table from '../models/Table.js';
import User from '../models/User.js';
import { getHandDetails, simulateWinOdds } from '../utils/poker.js';

// 🔁 Fake community cards (can be dynamic later)
const communityBoard = ['Qs', 'Jh', '9d', '4c', '2h'];

// 💡 Bet advice engine
const getBetSuggestion = (rank, winPercent) => {
  const win = parseFloat(winPercent);

  if (rank >= 6 || win > 80) return 'All-In';
  if (rank >= 4 || win > 65) return 'Raise';
  if (rank >= 2 || win > 40) return 'Check/Call';
  return 'Fold';
};

// ✅ PHASE 1 — Join table + fill with bots
export const joinTable = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    let table = await Table.findOne({ 'seats.5': { $exists: false } });

    if (!table) {
      table = new Table({ seats: [] });
    }

    // Add real player
    table.seats.push({
      playerId: user._id,
      name: user.username,
      isBot: false,
      avatar: user.avatar || ''
    });

    // Fill with bots
    while (table.seats.length < 6) {
      table.seats.push({
        name: `Bot-${Math.floor(Math.random() * 1000)}`,
        isBot: true,
        avatar: '🧠'
      });
    }

    await table.save();
    res.status(200).json({ table });

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// ✅ PHASE 2B — Get full table state with odds + bet suggestions
export const getTableState = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const isTraining = user.trainingMode;

    const table = await Table.findOne({ 'seats.playerId': user._id });
    if (!table) return res.status(404).json({ msg: 'No table found' });

    const seatsWithData = await Promise.all(
      table.seats.map(async (seat) => {
        let userData = {
          ...seat._doc,
          holeCards: ['??', '??'],
          hand: null
        };

        if (!seat.isBot && seat.playerId) {
          const seatUser = await User.findById(seat.playerId);
          const holeCards = ['Ah', 'Kh']; // Simulated cards

          if (isTraining) {
            const handData = getHandDetails(holeCards, communityBoard);
            const odds = simulateWinOdds(holeCards, communityBoard);

            userData.holeCards = holeCards;
            userData.hand = {
              ...handData,
              ...odds,
              suggestion: getBetSuggestion(handData.rank, odds.winPercent)
            };
          }
        }

        return userData;
      })
    );

    res.status(200).json({
      tableId: table._id,
      community: communityBoard,
      seats: seatsWithData
    });

  } catch (err) {
    res.status(500).json({ msg: 'Failed to get table state', error: err.message });
  }
};

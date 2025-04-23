import Table from '../models/Table.js';
import User from '../models/User.js';

// Add user to first open seat or create a new table
export const joinTable = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Find table with open seat
    let table = await Table.findOne({ 'seats.5': { $exists: false } });

    // If no table found, create new
    if (!table) {
      table = new Table({ seats: [] });
    }

    // Add real player to seats
    table.seats.push({
      playerId: user._id,
      name: user.username,
      isBot: false,
      avatar: user.avatar || ''
    });

    // Fill remaining seats with AI bots
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

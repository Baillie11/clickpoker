import mongoose from 'mongoose';

const blindSchema = new mongoose.Schema({
  round: Number,
  smallBlind: Number,
  bigBlind: Number,
  durationMinutes: Number
});

const payoutSchema = new mongoose.Schema({
  place: Number,
  percentage: Number
});

const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  blinds: [blindSchema],
  payouts: [payoutSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Tournament', TournamentSchema);

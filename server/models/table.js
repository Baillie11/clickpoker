import mongoose from 'mongoose';

const seatSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, default: 'AI Bot' },
  isBot: { type: Boolean, default: true },
  avatar: { type: String, default: '' }
});

const tableSchema = new mongoose.Schema({
  seats: {
    type: [seatSchema],
    default: []
  }
}, { timestamps: true });

export default mongoose.model('Table', tableSchema);

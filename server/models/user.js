import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar:   { type: String, default: '' },
  country:  { type: String, default: '' },
  state:    { type: String, default: '' },

  // ✅ Training Mode Toggle
  trainingMode: { type: Boolean, default: false }

}, { timestamps: true });

export default mongoose.model('User', UserSchema);

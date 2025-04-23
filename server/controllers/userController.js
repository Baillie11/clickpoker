import User from '../models/User.js';

// ✅ Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// ✅ Update user profile
export const updateProfile = async (req, res) => {
  const { country, state, avatar } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (country !== undefined) user.country = country;
    if (state !== undefined) user.state = state;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Update failed', error: err.message });
  }
};

// ✅ Toggle training mode
export const toggleTrainingMode = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.trainingMode = !user.trainingMode;
    await user.save();

    res.status(200).json({
      msg: `Training mode ${user.trainingMode ? 'enabled' : 'disabled'}`,
      trainingMode: user.trainingMode
    });
  } catch (err) {
    res.status(500).json({ msg: 'Toggle failed', error: err.message });
  }
};

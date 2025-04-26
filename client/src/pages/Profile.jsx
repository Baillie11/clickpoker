import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({
    avatar: '',
    country: '',
    state: ''
  });

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        avatar: user.avatar || '',
        country: user.country || '',
        state: user.state || ''
      });
    }
  }, [user]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/user/profile', form);
      localStorage.setItem('user', JSON.stringify(res.data));
      setMsg('Profile updated!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Update failed');
      setMsg('');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h2 className="text-2xl mb-4">Your Profile</h2>
      {msg && <p className="text-green-600">{msg}</p>}
      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleSubmit}>
        <input
          name="avatar"
          type="text"
          placeholder="Avatar emoji or URL"
          value={form.avatar}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          name="country"
          type="text"
          placeholder="Country"
          value={form.country}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          name="state"
          type="text"
          placeholder="State"
          value={form.state}
          onChange={handleChange}
          className="w-full mb-4 p-2 border rounded"
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Save Profile
        </button>
      </form>

      <button
        onClick={logout}
        className="w-full mt-4 bg-red-600 text-white p-2 rounded"
      >
        Log Out
      </button>
    </div>
  );
};

export default Profile;

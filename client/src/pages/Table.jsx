import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
// import SeatCard from '../components/SeatCard';

const Table = () => {
  const { user } = useAuth();
  const [table, setTable] = useState(null);
  const [error, setError] = useState('');

  const joinTable = async () => {
    try {
      const res = await api.post('/table/join');
      setTable(res.data.table);
    } catch (err) {
      setError('Failed to join table');
    }
  };

  useEffect(() => {
    joinTable();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-12 text-center">
      <h2 className="text-3xl mb-4">Click Poker Table</h2>
      {error && <p className="text-red-600">{error}</p>}
      {!table ? (
        <p className="text-gray-600">Loading table...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 justify-center">
          {table.seats.map((seat) => (
            <SeatCard key={seat._id} seat={seat} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Table;

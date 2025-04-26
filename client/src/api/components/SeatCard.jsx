const SeatCard = ({ seat }) => {
    return (
      <div className="border rounded p-4 bg-white shadow text-center">
        <div className="text-3xl mb-2">{seat.avatar || '🪑'}</div>
        <p className="font-bold">{seat.name}</p>
        <p className="text-xs text-gray-500">{seat.isBot ? 'Bot' : 'Player'}</p>
      </div>
    );
  };
  
  export default SeatCard;
  
// === File: click-poker/server/server.js ===

import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';

// ES Modules __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// ✅ Enable CORS + JSON
app.use(cors());
app.use(express.json());

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Click Poker API is live 🎲');
});

// ✅ Import routes
import authRoutes from './routes/authRoutes.js';
import tableRoutes from './routes/tableRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tournaments', tournamentRoutes);


// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('🔥 MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection failed:', err.message));

// ✅ Socket.IO setup (for future use)
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

io.on('connection', (socket) => {
  console.log(`⚡ Player connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
console.log('🧠 Booting Click Poker server...');
server.listen(PORT, () => {
  console.log(`🚀 Click Poker backend running on http://localhost:${PORT}`);
});

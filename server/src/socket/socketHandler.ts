import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { GameManager } from '../game/GameManager';
import { ServerToClientEvents, ClientToServerEvents } from '../../../shared/types';
import pool from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export class SocketHandler {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  private gameManager: GameManager;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST']
      }
    });

    this.gameManager = new GameManager();
    this.gameManager.setSocketHandler(this);
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const jwtSecret = process.env.JWT_SECRET || 'default-secret';
        const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected to poker table`);

      // Join table event
      socket.on('joinTable', async (tableId: string) => {
        try {
          if (!socket.userId) return;

          // Get user info from database
          const [rows] = await pool.execute(
            'SELECT username, full_name FROM users WHERE id = ?',
            [socket.userId]
          );

          if ((rows as any[]).length === 0) {
            console.error(`User with ID ${socket.userId} not found`);
            return;
          }

          const user = (rows as any[])[0];
          const username = user.username || `User_${socket.userId.slice(-6)}`;

          const success = this.gameManager.addPlayer(socket.userId, username);
          
          if (success) {
            socket.join(tableId);
            
            // Send initial game state to the player
            const playerView = this.gameManager.getPlayerView(socket.userId);
            socket.emit('gameStateUpdate', playerView);

            // Notify other players
            socket.to(tableId).emit('playerJoined', 
              playerView.players.find(p => p.userId === socket.userId)!
            );

            // Broadcast updated game state to all players
            this.broadcastGameState(tableId);
          }
        } catch (error) {
          console.error('Error joining table:', error);
        }
      });

      // Player action event
      socket.on('playerAction', (action: 'fold' | 'call' | 'raise' | 'check', amount?: number) => {
        try {
          if (!socket.userId) return;

          const success = this.gameManager.playerAction(socket.userId, action, amount);
          
          if (success) {
            // Broadcast the action to all players
            socket.rooms.forEach(room => {
              if (room !== socket.id) {
                this.io.to(room).emit('playerAction', socket.userId!, action, amount);
                this.broadcastGameState(room);
              }
            });
          }
        } catch (error) {
          console.error('Error processing player action:', error);
        }
      });

      // Leave table event
      socket.on('leaveTable', () => {
        try {
          if (!socket.userId) return;

          this.gameManager.removePlayer(socket.userId);
          
          // Notify other players and update game state
          socket.rooms.forEach(room => {
            if (room !== socket.id) {
              this.broadcastGameState(room);
            }
          });
          
          socket.leave('table');
        } catch (error) {
          console.error('Error leaving table:', error);
        }
      });

      // Disconnect event
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        
        if (socket.userId) {
          this.gameManager.removePlayer(socket.userId);
          
          // Update remaining players
          socket.rooms.forEach(room => {
            if (room !== socket.id) {
              this.broadcastGameState(room);
            }
          });
        }
      });
    });
  }

  private broadcastGameState(room: string): void {
    // Send personalized game state to each player in the room
    this.io.in(room).fetchSockets().then(sockets => {
      sockets.forEach(socket => {
        const authSocket = socket as unknown as AuthenticatedSocket;
        if (authSocket.userId) {
          const playerView = this.gameManager.getPlayerView(authSocket.userId);
          authSocket.emit('gameStateUpdate', playerView);
        }
      });
    });
  }

  public getGameManager(): GameManager {
    return this.gameManager;
  }
}

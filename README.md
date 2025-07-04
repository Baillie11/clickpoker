# Click Poker

A full-stack poker application built with React, Node.js, TypeScript, and MySQL.

## Project Phases

### Phase 1 - Core Functionality ✅
- User authentication (email, username, full name)
- 6-seat poker table
- AI players to fill empty seats
- Basic poker game mechanics

### Phase 1a - User Profiles ✅
- Profile images/avatars
- Extended user information (state, country, etc.)

### Phase 2 - Training Mode
- Reveal hole cards (single player)
- Training mode features

### Phase 2a - Advanced Training
- Number of outs calculation
- Winning odds display
- Suggested betting amounts

### Phase 3 - Tournament Management
- Custom blind levels
- Round management
- Payout calculator

### Phase 4 - Subscriptions
- User subscription system

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express and TypeScript
- **Database**: MySQL
- **Real-time**: Socket.io
- **Authentication**: JWT

## Project Structure

```
click-poker/
├── client/          # React frontend
├── server/          # Node.js backend
├── database/        # Database scripts and migrations
└── shared/          # Shared types and utilities
```

## Setup Instructions

1. Install dependencies for both client and server
2. Set up PostgreSQL database
3. Configure environment variables
4. Run database migrations
5. Start both client and server

## Development

```bash
# Start server (from server directory)
npm run dev

# Start client (from client directory)
npm start
```

## Current Status

🎉 **Phase 1 COMPLETE!** ✅

### ✅ Completed Features:
- **User Authentication**: Full registration/login system with JWT
- **6-Seat Poker Table**: Live poker table with real-time gameplay
- **AI Players**: Intelligent AI opponents with different personalities
- **Live Gameplay**: Real-time card dealing, betting, and game progression
- **Socket.IO Integration**: Real-time multiplayer communication
- **Game Engine**: Complete poker game logic (pre-flop, flop, turn, river)
- **Responsive UI**: Mobile-friendly poker table interface

### 🎮 How to Play:
1. Register/Login to your account
2. Automatically join the 6-seat poker table
3. Play against 5 AI opponents with unique personalities
4. Use Fold, Check/Call, and Raise actions
5. Watch live gameplay with real-time updates

### 🤖 AI Personalities:
- **BluffMaster**: Aggressive bluffer
- **CyberShark**: Tight-aggressive player
- **CardCounter**: Conservative and calculated
- **PokerBot**: Balanced strategy
- **ChipStack**: Solid player
- And more!

### 🎉 **Phase 1A COMPLETE!** ✅

**New Features Added:**
- **🖼️ Profile Avatars**: Auto-generated avatars or custom image URLs
- **📝 Extended Profiles**: Bio, location (city, state, country), experience level
- **🎮 Poker Preferences**: Favorite variant, preferred stakes, privacy settings
- **📊 Player Stats**: Games played and total winnings tracking
- **⚙️ Profile Management**: Easy-to-use profile editor with real-time updates
- **🎨 Beautiful UI**: Modern profile modal with responsive design

**How to Use:**
1. Click the "👤 Profile" button in the top header
2. View your complete player profile
3. Click "Edit Profile" to customize your information
4. Add a custom avatar URL or use auto-generated avatars
5. Update your poker preferences and experience level

**Ready for Phase 2**: Training mode with hole card visibility

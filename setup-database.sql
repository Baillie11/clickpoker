-- Drop and recreate database to ensure clean setup
DROP DATABASE IF EXISTS poker_app;
CREATE DATABASE poker_app;
USE poker_app;

-- Users table with all required fields
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image TEXT,
    avatar_url TEXT,
    bio TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(50),
    favorite_poker_variant VARCHAR(50) DEFAULT 'Texas Hold''em',
    experience_level ENUM('Beginner', 'Intermediate', 'Advanced', 'Professional') DEFAULT 'Beginner',
    total_games_played INTEGER DEFAULT 0,
    total_winnings INTEGER DEFAULT 0,
    preferred_table_stakes VARCHAR(50) DEFAULT 'Low',
    privacy_level ENUM('Public', 'Friends', 'Private') DEFAULT 'Public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Poker tables
CREATE TABLE poker_tables (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    small_blind INTEGER NOT NULL DEFAULT 10,
    big_blind INTEGER NOT NULL DEFAULT 20,
    max_players INTEGER NOT NULL DEFAULT 6,
    is_training_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Game sessions
CREATE TABLE game_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    table_id VARCHAR(36) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    winner_id VARCHAR(36),
    final_pot INTEGER DEFAULT 0,
    FOREIGN KEY (table_id) REFERENCES poker_tables(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
);

-- Player sessions (tracks players in games)
CREATE TABLE player_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    game_session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36), -- NULL for AI players
    username VARCHAR(50) NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0 AND position <= 5),
    starting_chips INTEGER NOT NULL DEFAULT 1000,
    final_chips INTEGER DEFAULT 0,
    is_ai BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_game_sessions_table_id ON game_sessions(table_id);
CREATE INDEX idx_player_sessions_game_id ON player_sessions(game_session_id);
CREATE INDEX idx_player_sessions_user_id ON player_sessions(user_id);

-- Insert a default poker table
INSERT INTO poker_tables (id, name, small_blind, big_blind, max_players) 
VALUES (UUID(), 'Main Poker Table', 10, 20, 6);

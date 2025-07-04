const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: ''
    });

    console.log('Connected to MySQL server');

    // Drop and create database
    await connection.execute('DROP DATABASE IF EXISTS poker_app');
    console.log('Dropped existing database (if any)');
    
    await connection.execute('CREATE DATABASE poker_app');
    console.log('Created poker_app database');
    
    // Reconnect to the specific database
    await connection.end();
    const dbConnection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'poker_app'
    });
    console.log('Connected to poker_app database');

    // Create users table with all required columns
    await connection.execute(`
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
      )
    `);
    console.log('Created users table');

    // Create poker_tables table
    await connection.execute(`
      CREATE TABLE poker_tables (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        small_blind INTEGER NOT NULL DEFAULT 10,
        big_blind INTEGER NOT NULL DEFAULT 20,
        max_players INTEGER NOT NULL DEFAULT 6,
        is_training_mode BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created poker_tables table');

    // Create game_sessions table
    await connection.execute(`
      CREATE TABLE game_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        table_id VARCHAR(36) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        winner_id VARCHAR(36),
        final_pot INTEGER DEFAULT 0,
        FOREIGN KEY (table_id) REFERENCES poker_tables(id),
        FOREIGN KEY (winner_id) REFERENCES users(id)
      )
    `);
    console.log('Created game_sessions table');

    // Create player_sessions table
    await connection.execute(`
      CREATE TABLE player_sessions (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        game_session_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        username VARCHAR(50) NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0 AND position <= 5),
        starting_chips INTEGER NOT NULL DEFAULT 1000,
        final_chips INTEGER DEFAULT 0,
        is_ai BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP NULL,
        FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Created player_sessions table');

    // Create indexes
    await connection.execute('CREATE INDEX idx_users_email ON users(email)');
    await connection.execute('CREATE INDEX idx_users_username ON users(username)');
    await connection.execute('CREATE INDEX idx_game_sessions_table_id ON game_sessions(table_id)');
    await connection.execute('CREATE INDEX idx_player_sessions_game_id ON player_sessions(game_session_id)');
    await connection.execute('CREATE INDEX idx_player_sessions_user_id ON player_sessions(user_id)');
    console.log('Created indexes');

    // Insert default poker table
    await connection.execute(`
      INSERT INTO poker_tables (name, small_blind, big_blind, max_players) 
      VALUES ('Main Poker Table', 10, 20, 6)
    `);
    console.log('Inserted default poker table');

    await connection.end();
    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();

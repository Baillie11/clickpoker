import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../config/database';

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, username, fullName, password } = req.body;

    // Check if user already exists
    const [userExists] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if ((userExists as any[]).length > 0) {
      res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (id, email, username, full_name, password_hash) 
       VALUES (UUID(), ?, ?, ?, ?)`,
      [email, username, fullName, passwordHash]
    );

    // Get the created user
    const [newUser] = await pool.execute(
      'SELECT id, email, username, full_name, created_at FROM users WHERE email = ?',
      [email]
    );

    const user = (newUser as any[])[0];

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        res.status(500).json({ 
          message: 'Database table not found. Please ensure the database schema is imported.' 
        });
        return;
      }
      if (error.message.includes('ER_ACCESS_DENIED_ERROR') || error.message.includes('ECONNREFUSED')) {
        res.status(500).json({ 
          message: 'Database connection failed. Please check if MySQL is running.' 
        });
        return;
      }
      if (error.message.includes('ER_BAD_DB_ERROR')) {
        res.status(500).json({ 
          message: 'Database "poker_app" not found. Please create the database first.' 
        });
        return;
      }
    }
    
    res.status(500).json({ 
      message: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user
    const [result] = await pool.execute(
      'SELECT id, email, username, full_name, password_hash, profile_image, state, country, created_at FROM users WHERE email = ?',
      [email]
    );

    if ((result as any[]).length === 0) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const user = (result as any[])[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        profileImage: user.profile_image,
        state: user.state,
        country: user.country,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        res.status(500).json({ 
          message: 'Database table not found. Please ensure the database schema is imported.' 
        });
        return;
      }
      if (error.message.includes('ER_ACCESS_DENIED_ERROR') || error.message.includes('ECONNREFUSED')) {
        res.status(500).json({ 
          message: 'Database connection failed. Please check if MySQL is running.' 
        });
        return;
      }
    }
    
    res.status(500).json({ 
      message: 'Server error during login',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const [result] = await pool.execute(
      'SELECT id, email, username, full_name, profile_image, state, country, created_at FROM users WHERE id = ?',
      [userId]
    );

    if ((result as any[]).length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = (result as any[])[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        profileImage: user.profile_image,
        state: user.state,
        country: user.country,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

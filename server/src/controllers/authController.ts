import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database';
import { validationResult } from 'express-validator';

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
      `SELECT id, email, username, full_name, password_hash, profile_image, avatar_url, bio, 
              city, state, country, timezone, favorite_poker_variant, experience_level, 
              total_games_played, total_winnings, preferred_table_stakes, privacy_level, created_at 
       FROM users WHERE email = ?`,
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
        avatarUrl: user.avatar_url,
        bio: user.bio,
        city: user.city,
        state: user.state,
        country: user.country,
        timezone: user.timezone,
        favoritePokerVariant: user.favorite_poker_variant,
        experienceLevel: user.experience_level,
        totalGamesPlayed: user.total_games_played,
        totalWinnings: user.total_winnings,
        preferredTableStakes: user.preferred_table_stakes,
        privacyLevel: user.privacy_level,
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
      `SELECT id, email, username, full_name, profile_image, avatar_url, bio, 
              city, state, country, timezone, favorite_poker_variant, experience_level, 
              total_games_played, total_winnings, preferred_table_stakes, privacy_level, created_at 
       FROM users WHERE id = ?`,
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
        avatarUrl: user.avatar_url,
        bio: user.bio,
        city: user.city,
        state: user.state,
        country: user.country,
        timezone: user.timezone,
        favoritePokerVariant: user.favorite_poker_variant,
        experienceLevel: user.experience_level,
        totalGamesPlayed: user.total_games_played,
        totalWinnings: user.total_winnings,
        preferredTableStakes: user.preferred_table_stakes,
        privacyLevel: user.privacy_level,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const {
      fullName,
      bio,
      city,
      state,
      country,
      timezone,
      favoritePokerVariant,
      experienceLevel,
      preferredTableStakes,
      privacyLevel,
      profileImage,
      avatarUrl
    } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(fullName);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    if (timezone !== undefined) {
      updates.push('timezone = ?');
      values.push(timezone);
    }
    if (favoritePokerVariant !== undefined) {
      updates.push('favorite_poker_variant = ?');
      values.push(favoritePokerVariant);
    }
    if (experienceLevel !== undefined) {
      updates.push('experience_level = ?');
      values.push(experienceLevel);
    }
    if (preferredTableStakes !== undefined) {
      updates.push('preferred_table_stakes = ?');
      values.push(preferredTableStakes);
    }
    if (privacyLevel !== undefined) {
      updates.push('privacy_level = ?');
      values.push(privacyLevel);
    }
    if (profileImage !== undefined) {
      updates.push('profile_image = ?');
      values.push(profileImage);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    // Add updated_at and userId
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    await pool.execute(query, values);

    // Fetch updated user data
    const [result] = await pool.execute(
      `SELECT id, email, username, full_name, profile_image, avatar_url, bio, 
              city, state, country, timezone, favorite_poker_variant, experience_level, 
              total_games_played, total_winnings, preferred_table_stakes, privacy_level, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    const user = (result as any[])[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        profileImage: user.profile_image,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        city: user.city,
        state: user.state,
        country: user.country,
        timezone: user.timezone,
        favoritePokerVariant: user.favorite_poker_variant,
        experienceLevel: user.experience_level,
        totalGamesPlayed: user.total_games_played,
        totalWinnings: user.total_winnings,
        preferredTableStakes: user.preferred_table_stakes,
        privacyLevel: user.privacy_level,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// Request password reset
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Check if user exists
    const [result] = await pool.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if ((result as any[]).length === 0) {
      // Don't reveal if email exists or not for security
      res.status(200).json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
      return;
    }

    const user = (result as any[])[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, user.id]
    );

    // In a real application, you would send an email here
    // For now, we'll log the reset link to the console
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    console.log(`Password reset link for ${email}: ${resetLink}`);
    
    // TODO: Implement actual email sending here
    // await sendPasswordResetEmail(email, resetLink);

    res.status(200).json({ 
      message: 'Password reset instructions have been sent to your email address.',
      // In development, include the reset link in the response
      ...(process.env.NODE_ENV === 'development' && { resetLink })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
};

// Verify reset token
export const verifyResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ message: 'Reset token is required' });
      return;
    }

    // Check if token exists and is not expired
    const [result] = await pool.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if ((result as any[]).length === 0) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    res.status(200).json({ message: 'Reset token is valid' });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Server error verifying reset token' });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      res.status(400).json({ message: 'Reset token and new password are required' });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      res.status(400).json({ 
        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' 
      });
      return;
    }

    // Check if token exists and is not expired
    const [result] = await pool.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if ((result as any[]).length === 0) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    const user = (result as any[])[0];

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

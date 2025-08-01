import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../types';
import pool from '../config/database';

export class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as jwt.SignOptions);
  }

  // Verify JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Register new user
  async register(username: string, password: string, email?: string): Promise<User> {
    const client = await pool.connect();
    
    try {
      // Check if username already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Username already exists');
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingEmail.rows.length > 0) {
          throw new Error('Email already exists');
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Insert new user
      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, role, created_at, updated_at`,
        [username, email, hashedPassword, 'user']
      );

      return result.rows[0] as User;
    } finally {
      client.release();
    }
  }

  // Login user
  async login(username: string, password: string): Promise<User> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid username or password');
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Remove password hash from returned user object
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } finally {
      client.release();
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0] as User : null;
    } finally {
      client.release();
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<User> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, username, email, role, created_at, updated_at`,
        [role, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0] as User;
    } finally {
      client.release();
    }
  }

  // Create admin user (for initial setup)
  async createAdminUser(username: string, password: string, email?: string): Promise<User> {
    const client = await pool.connect();

    try {
      // Check if admin already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE role = $1',
        ['admin']
      );

      if (existingAdmin.rows.length > 0) {
        throw new Error('Admin user already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Insert admin user
      const result = await client.query(
        `INSERT INTO users (username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, role, created_at, updated_at`,
        [username, email, hashedPassword, 'admin']
      );

      return result.rows[0] as User;
    } finally {
      client.release();
    }
  }
}

export const authService = new AuthService();
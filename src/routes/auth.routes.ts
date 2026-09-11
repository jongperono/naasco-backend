import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const auth = new Hono();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
});

// Helper function to generate JWT token
const generateToken = (userId: number, email: string, roleId: number) => {
  return jwt.sign(
    { userId, email, roleId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validatedData = loginSchema.parse(body);

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (!user) {
      return c.json(
        { error: 'Invalid email or password' },
        401
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return c.json(
        { error: 'Account is deactivated. Please contact support.' },
        403
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      return c.json(
        { error: 'Invalid email or password' },
        401
      );
    }

    // Get role information
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.roleId);

    // Return success response
    return c.json({
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          role: role ? role.name : 'unknown',
          roleId: user.roleId,
          isActive: user.isActive,
        },
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Validation failed', details: error.issues },
        400
      );
    }

    console.error('Login error:', error);
    return c.json(
      { error: 'An error occurred during login' },
      500
    );
  }
});

// POST /api/auth/register
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser) {
      return c.json(
        { error: 'Email already registered' },
        409
      );
    }

    // Get the default 'member' role
    const [memberRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'member'))
      .limit(1);

    if (!memberRole) {
      return c.json(
        { error: 'Default role not found. Please contact support.' },
        500
      );
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phoneNumber: validatedData.phoneNumber || null,
        roleId: memberRole.id,
        isActive: true,
      })
      .$returningId();

    if (!newUser) {
      return c.json(
        { error: 'Failed to create user' },
        500
      );
    }

    // Fetch the created user
    const [createdUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    if (!createdUser) {
      return c.json(
        { error: 'Failed to create user' },
        500
      );
    }

    // Generate JWT token
    const token = generateToken(createdUser.id, createdUser.email, createdUser.roleId);

    // Return success response
    return c.json({
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          phoneNumber: createdUser.phoneNumber,
          role: memberRole.name,
          roleId: createdUser.roleId,
          isActive: createdUser.isActive,
        },
      },
    }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Validation failed', details: error.issues },
        400
      );
    }

    console.error('Registration error:', error);
    return c.json(
      { error: 'An error occurred during registration' },
      500
    );
  }
});

// GET /api/auth/me (verify token and get current user)
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        { error: 'No token provided' },
        401
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as { userId: number; email: string; roleId: number };

    // Fetch user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return c.json(
        { error: 'User not found' },
        404
      );
    }

    if (!user.isActive) {
      return c.json(
        { error: 'Account is deactivated' },
        403
      );
    }

    // Get role information
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    return c.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          role: role ? role.name : 'unknown',
          roleId: user.roleId,
          isActive: user.isActive,
        },
      },
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return c.json(
        { error: 'Invalid token' },
        401
      );
    }

    if (error.name === 'TokenExpiredError') {
      return c.json(
        { error: 'Token expired' },
        401
      );
    }

    console.error('Auth verification error:', error);
    return c.json(
      { error: 'An error occurred during authentication' },
      500
    );
  }
});

export default auth;

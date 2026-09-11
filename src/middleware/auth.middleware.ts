import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface AuthPayload {
  userId: number;
  email: string;
  roleId: number;
}

// Extend Hono's context type to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthPayload;
  }
}

/**
 * Middleware to verify JWT token and attach user to context
 */
export const authMiddleware = async (c: Context, next: Next) => {
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
    ) as AuthPayload;

    // Verify user still exists and is active
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

    // Attach user to context
    c.set('user', decoded);

    await next();
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

    console.error('Auth middleware error:', error);
    return c.json(
      { error: 'Authentication failed' },
      500
    );
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        { error: 'Unauthorized' },
        401
      );
    }

    // Fetch user's role name
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    if (!userRecord) {
      return c.json(
        { error: 'User not found' },
        404
      );
    }

    // Get role information
    const { roles } = await import('../db/schema.js');
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, userRecord.roleId))
      .limit(1);

    if (!role || !allowedRoles.includes(role.name)) {
      return c.json(
        { error: 'Insufficient permissions' },
        403
      );
    }

    await next();
  };
};

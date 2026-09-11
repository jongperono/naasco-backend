import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const usersRouter = new Hono();

// Validation schema for creating a user
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// Apply auth middleware to all routes
usersRouter.use('/*', authMiddleware);

// POST /api/users - Create a new user (admin/manager only)
usersRouter.post('/', requireRole(['admin', 'manager']), async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validatedData = createUserSchema.parse(body);

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

    // Determine role
    let targetRoleId = validatedData.roleId;

    if (!targetRoleId) {
      // If no roleId provided, use 'member' as default
      const [memberRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, 'member'))
        .limit(1);

      if (!memberRole) {
        return c.json(
          { error: 'Default role not found' },
          500
        );
      }
      targetRoleId = memberRole.id;
    } else {
      // Validate that the provided roleId exists
      const [targetRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, targetRoleId))
        .limit(1);

      if (!targetRole) {
        return c.json(
          { error: 'Invalid role ID' },
          400
        );
      }
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
        roleId: targetRoleId,
        isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
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
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phoneNumber,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    if (!createdUser) {
      return c.json(
        { error: 'Failed to fetch created user' },
        500
      );
    }

    // Get role information
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, createdUser.roleId))
      .limit(1);

    return c.json({
      message: 'User created successfully',
      data: {
        user: {
          ...createdUser,
          role: role ? role.name : 'unknown',
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

    console.error('Create user error:', error);
    return c.json(
      { error: 'Failed to create user' },
      500
    );
  }
});

// GET /api/users/profile - Get current user profile
usersRouter.get('/profile', async (c) => {
  try {
    const authUser = c.get('user');

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phoneNumber,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1);

    if (!user) {
      return c.json(
        { error: 'User not found' },
        404
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
          ...user,
          role: role ? role.name : 'unknown',
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json(
      { error: 'Failed to fetch profile' },
      500
    );
  }
});

// GET /api/users - Get all users (admin only)
usersRouter.get('/', requireRole(['admin', 'manager']), async (c) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phoneNumber,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users);

    // Get all roles
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map(r => [r.id, r.name]));

    // Map users with role names
    const usersWithRoles = allUsers.map(user => ({
      ...user,
      role: roleMap.get(user.roleId) || 'unknown',
    }));

    return c.json({
      data: {
        users: usersWithRoles,
        total: usersWithRoles.length,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json(
      { error: 'Failed to fetch users' },
      500
    );
  }
});

// GET /api/users/:id - Get user by ID (admin/manager only)
usersRouter.get('/:id', requireRole(['admin', 'manager']), async (c) => {
  try {
    const userIdParam = c.req.param('id');
    const userId = parseInt(userIdParam || '0');

    if (isNaN(userId) || userId === 0) {
      return c.json(
        { error: 'Invalid user ID' },
        400
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phoneNumber,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json(
        { error: 'User not found' },
        404
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
          ...user,
          role: role ? role.name : 'unknown',
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json(
      { error: 'Failed to fetch user' },
      500
    );
  }
});

export default usersRouter;

import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { auditFromContext, AuditAction, AuditEntityType, sanitizeForAudit } from '../utils/audit.utils.js';

const membersRouter = new Hono();

// Validation schema for creating a member
const createMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// Apply auth middleware to all routes
membersRouter.use('/*', authMiddleware);

// POST /api/members - Create a new member (admin/manager only)
membersRouter.post('/', requireRole(['admin', 'manager']), async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validatedData = createMemberSchema.parse(body);

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
        { error: 'Failed to create member' },
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
        { error: 'Failed to fetch created member' },
        500
      );
    }

    // Get role information
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, createdUser.roleId))
      .limit(1);

    // Audit log: Member created
    const authUser = c.get('user');
    await auditFromContext(c, {
      userId: authUser?.userId,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.MEMBER,
      entityId: createdUser.id,
      newValues: sanitizeForAudit({
        ...createdUser,
        role: role?.name,
      }),
    });

    return c.json({
      message: 'Member created successfully',
      data: {
        member: {
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

    console.error('Create member error:', error);
    return c.json(
      { error: 'Failed to create member' },
      500
    );
  }
});

// GET /api/members - Get all members (admin/manager only)
membersRouter.get('/', requireRole(['admin', 'manager']), async (c) => {
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
    const membersWithRoles = allUsers.map(user => ({
      ...user,
      role: roleMap.get(user.roleId) || 'unknown',
    }));

    return c.json({
      data: {
        members: membersWithRoles,
        total: membersWithRoles.length,
      },
    });
  } catch (error) {
    console.error('Get members error:', error);
    return c.json(
      { error: 'Failed to fetch members' },
      500
    );
  }
});

// GET /api/members/:id - Get member by ID (admin/manager only)
membersRouter.get('/:id', requireRole(['admin', 'manager']), async (c) => {
  try {
    const memberIdParam = c.req.param('id');
    const memberId = parseInt(memberIdParam || '0');

    if (isNaN(memberId) || memberId === 0) {
      return c.json(
        { error: 'Invalid member ID' },
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
      .where(eq(users.id, memberId))
      .limit(1);

    if (!user) {
      return c.json(
        { error: 'Member not found' },
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
        member: {
          ...user,
          role: role ? role.name : 'unknown',
        },
      },
    });
  } catch (error) {
    console.error('Get member error:', error);
    return c.json(
      { error: 'Failed to fetch member' },
      500
    );
  }
});

// PUT /api/members/:id - Update member (admin/manager only)
membersRouter.put('/:id', requireRole(['admin', 'manager']), async (c) => {
  try {
    const memberIdParam = c.req.param('id');
    const memberId = parseInt(memberIdParam || '0');

    if (isNaN(memberId) || memberId === 0) {
      return c.json(
        { error: 'Invalid member ID' },
        400
      );
    }

    const body = await c.req.json();

    // Validation schema for updating a member
    const updateMemberSchema = z.object({
      email: z.string().email('Invalid email format').optional(),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      firstName: z.string().min(1, 'First name is required').optional(),
      lastName: z.string().min(1, 'Last name is required').optional(),
      phoneNumber: z.string().optional(),
      roleId: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    });

    // Validate request body
    const validatedData = updateMemberSchema.parse(body);

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, memberId))
      .limit(1);

    if (!existingUser) {
      return c.json(
        { error: 'Member not found' },
        404
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.email !== undefined) {
      // Check if email is already taken by another user
      const [emailCheck] = await db
        .select()
        .from(users)
        .where(eq(users.email, validatedData.email))
        .limit(1);

      if (emailCheck && emailCheck.id !== memberId) {
        return c.json(
          { error: 'Email already taken by another user' },
          409
        );
      }
      updateData.email = validatedData.email;
    }

    if (validatedData.firstName !== undefined) {
      updateData.firstName = validatedData.firstName;
    }

    if (validatedData.lastName !== undefined) {
      updateData.lastName = validatedData.lastName;
    }

    if (validatedData.phoneNumber !== undefined) {
      updateData.phoneNumber = validatedData.phoneNumber || null;
    }

    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    if (validatedData.roleId !== undefined) {
      // Validate that the provided roleId exists
      const [targetRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, validatedData.roleId))
        .limit(1);

      if (!targetRole) {
        return c.json(
          { error: 'Invalid role ID' },
          400
        );
      }
      updateData.roleId = validatedData.roleId;
    }

    // Hash password if provided
    if (validatedData.password) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
      updateData.password = await bcrypt.hash(validatedData.password, saltRounds);
    }

    // Update user
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, memberId));

    // Fetch updated user
    const [updatedUser] = await db
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
      .where(eq(users.id, memberId))
      .limit(1);

    if (!updatedUser) {
      return c.json(
        { error: 'Failed to fetch updated member' },
        500
      );
    }

    // Get role information
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, updatedUser.roleId))
      .limit(1);

    // Audit log: Member updated
    const authUser = c.get('user');
    const oldValues = sanitizeForAudit({
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      phoneNumber: existingUser.phoneNumber,
      roleId: existingUser.roleId,
      isActive: existingUser.isActive,
    });
    const newValues = sanitizeForAudit({
      ...updatedUser,
      role: role?.name,
    });
    await auditFromContext(c, {
      userId: authUser?.userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.MEMBER,
      entityId: memberId,
      oldValues,
      newValues,
    });

    return c.json({
      message: 'Member updated successfully',
      data: {
        member: {
          ...updatedUser,
          role: role ? role.name : 'unknown',
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

    console.error('Update member error:', error);
    return c.json(
      { error: 'Failed to update member' },
      500
    );
  }
});

// DELETE /api/members/:id - Delete member (admin only)
membersRouter.delete('/:id', requireRole(['admin']), async (c) => {
  try {
    const memberIdParam = c.req.param('id');
    const memberId = parseInt(memberIdParam || '0');

    if (isNaN(memberId) || memberId === 0) {
      return c.json(
        { error: 'Invalid member ID' },
        400
      );
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, memberId))
      .limit(1);

    if (!existingUser) {
      return c.json(
        { error: 'Member not found' },
        404
      );
    }

    // Prevent self-deletion
    const authUser = c.get('user');
    if (authUser.userId === memberId) {
      return c.json(
        { error: 'Cannot delete your own account' },
        400
      );
    }

    // Delete user
    await db
      .delete(users)
      .where(eq(users.id, memberId));

    // Audit log: Member deleted
    await auditFromContext(c, {
      userId: authUser.userId,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.MEMBER,
      entityId: memberId,
      oldValues: sanitizeForAudit({
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        phoneNumber: existingUser.phoneNumber,
        roleId: existingUser.roleId,
        isActive: existingUser.isActive,
      }),
    });

    return c.json({
      message: 'Member deleted successfully',
    });
  } catch (error) {
    console.error('Delete member error:', error);
    return c.json(
      { error: 'Failed to delete member' },
      500
    );
  }
});

export default membersRouter;

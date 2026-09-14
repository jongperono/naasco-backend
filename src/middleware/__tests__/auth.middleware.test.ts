import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, pool } from '../../db/index.js';
import { users, roles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../auth.middleware.js';

// Create test app
const app = new Hono();

// Test routes that use the middleware
app.get('/protected', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({ message: 'Protected route accessed', user });
});

app.get('/admin-only', authMiddleware, requireRole(['admin']), (c) => {
  return c.json({ message: 'Admin route accessed' });
});

app.get('/member-or-admin', authMiddleware, requireRole(['member', 'admin']), (c) => {
  return c.json({ message: 'Member or admin route accessed' });
});

// Test data
const testUsers = {
  admin: {
    email: 'admin-test@example.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'User',
  },
  member: {
    email: 'member-test@example.com',
    password: 'password123',
    firstName: 'Member',
    lastName: 'User',
  },
  inactive: {
    email: 'inactive-test@example.com',
    password: 'password123',
    firstName: 'Inactive',
    lastName: 'User',
  },
};

let adminRoleId: number;
let memberRoleId: number;
let adminUserId: number;
let memberUserId: number;
let inactiveUserId: number;
let adminToken: string;
let memberToken: string;
let inactiveToken: string;

describe('Auth Middleware Tests', () => {
  // Setup: Create test roles and users
  beforeAll(async () => {
    // Create or get admin role
    const [existingAdminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'admin'))
      .limit(1);

    if (existingAdminRole) {
      adminRoleId = existingAdminRole.id;
    } else {
      const [newAdminRole] = await db
        .insert(roles)
        .values({
          name: 'admin',
          description: 'Administrator role',
        })
        .$returningId();
      
      if (!newAdminRole) {
        throw new Error('Failed to create admin role');
      }
      adminRoleId = newAdminRole.id;
    }

    // Create or get member role
    const [existingMemberRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'member'))
      .limit(1);

    if (existingMemberRole) {
      memberRoleId = existingMemberRole.id;
    } else {
      const [newMemberRole] = await db
        .insert(roles)
        .values({
          name: 'member',
          description: 'Member role',
        })
        .$returningId();
      
      if (!newMemberRole) {
        throw new Error('Failed to create member role');
      }
      memberRoleId = newMemberRole.id;
    }
  });

  beforeEach(async () => {
    // Delete test users if they exist
    await db.delete(users).where(eq(users.email, testUsers.admin.email));
    await db.delete(users).where(eq(users.email, testUsers.member.email));
    await db.delete(users).where(eq(users.email, testUsers.inactive.email));

    // Create admin user
    const hashedPassword = await bcrypt.hash(testUsers.admin.password, 10);
    const [adminUser] = await db
      .insert(users)
      .values({
        email: testUsers.admin.email,
        password: hashedPassword,
        firstName: testUsers.admin.firstName,
        lastName: testUsers.admin.lastName,
        roleId: adminRoleId,
        isActive: true,
      })
      .$returningId();

    if (!adminUser) {
      throw new Error('Failed to create admin user');
    }
    adminUserId = adminUser.id;

    // Create member user
    const [memberUser] = await db
      .insert(users)
      .values({
        email: testUsers.member.email,
        password: hashedPassword,
        firstName: testUsers.member.firstName,
        lastName: testUsers.member.lastName,
        roleId: memberRoleId,
        isActive: true,
      })
      .$returningId();

    if (!memberUser) {
      throw new Error('Failed to create member user');
    }
    memberUserId = memberUser.id;

    // Create inactive user
    const [inactiveUser] = await db
      .insert(users)
      .values({
        email: testUsers.inactive.email,
        password: hashedPassword,
        firstName: testUsers.inactive.firstName,
        lastName: testUsers.inactive.lastName,
        roleId: memberRoleId,
        isActive: false,
      })
      .$returningId();

    if (!inactiveUser) {
      throw new Error('Failed to create inactive user');
    }
    inactiveUserId = inactiveUser.id;

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUserId, email: testUsers.admin.email, roleId: adminRoleId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    memberToken = jwt.sign(
      { userId: memberUserId, email: testUsers.member.email, roleId: memberRoleId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    inactiveToken = jwt.sign(
      { userId: inactiveUserId, email: testUsers.inactive.email, roleId: memberRoleId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
  });

  afterAll(async () => {
    // Cleanup test users
    await db.delete(users).where(eq(users.email, testUsers.admin.email));
    await db.delete(users).where(eq(users.email, testUsers.member.email));
    await db.delete(users).where(eq(users.email, testUsers.inactive.email));

    // Close database connection
    await pool.end();
  });

  describe('authMiddleware - Success Cases', () => {
    it('should allow access with valid token', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Protected route accessed');
      expect(data.user.userId).toBe(adminUserId);
      expect(data.user.email).toBe(testUsers.admin.email);
    });

    it('should attach user payload to context', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toHaveProperty('userId', memberUserId);
      expect(data.user).toHaveProperty('email', testUsers.member.email);
      expect(data.user).toHaveProperty('roleId', memberRoleId);
    });
  });

  describe('authMiddleware - Missing/Invalid Token', () => {
    it('should reject request without Authorization header', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'No token provided');
    });

    it('should reject request with empty Authorization header', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: '',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'No token provided');
    });

    it('should reject request without "Bearer " prefix', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: adminToken,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'No token provided');
    });

    it('should reject request with invalid token format', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token-format',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });

    it('should reject request with malformed JWT', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('authMiddleware - Token Validation', () => {
    it('should reject token signed with wrong secret', async () => {
      const wrongToken = jwt.sign(
        { userId: adminUserId, email: testUsers.admin.email, roleId: adminRoleId },
        'wrong-secret-key',
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${wrongToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: adminUserId, email: testUsers.admin.email, roleId: adminRoleId },
        process.env.JWT_SECRET!,
        { expiresIn: '0s', algorithm: 'HS256' }
      );

      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Token expired');
    });

    it('should reject token for non-existent user', async () => {
      const nonExistentToken = jwt.sign(
        { userId: 999999, email: 'nonexistent@example.com', roleId: memberRoleId },
        process.env.JWT_SECRET!,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${nonExistentToken}`,
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'User not found');
    });

    it('should reject token for inactive user', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${inactiveToken}`,
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Account is deactivated');
    });
  });

  describe('authMiddleware - Security', () => {
    it('should use HS256 algorithm for token verification', async () => {
      // Try to create a token with a different algorithm (none algorithm attack)
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ userId: adminUserId, email: testUsers.admin.email })).toString('base64');
      const noneAlgToken = `${header}.${payload}.`;

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${noneAlgToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });

    it('should validate token signature', async () => {
      // Create a valid-looking but unsigned token
      const [header, payload] = adminToken.split('.');
      const tamperedToken = `${header}.${payload}.tampered-signature`;

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('requireRole middleware - Success Cases', () => {
    it('should allow admin to access admin-only route', async () => {
      const response = await app.request('/admin-only', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Admin route accessed');
    });

    it('should allow member to access member route', async () => {
      const response = await app.request('/member-or-admin', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Member or admin route accessed');
    });

    it('should allow admin to access member route', async () => {
      const response = await app.request('/member-or-admin', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Member or admin route accessed');
    });
  });

  describe('requireRole middleware - Permission Denied', () => {
    it('should reject member trying to access admin-only route', async () => {
      const response = await app.request('/admin-only', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Insufficient permissions');
    });

    it('should reject request without authentication', async () => {
      // Create a route that bypasses authMiddleware to test requireRole alone
      const testApp = new Hono();
      testApp.get('/role-only', requireRole(['admin']), (c) => {
        return c.json({ message: 'Should not reach here' });
      });

      const response = await testApp.request('/role-only', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with extra whitespace', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer  ${adminToken}  `,
        },
      });

      // Should fail because of extra whitespace in token
      expect(response.status).toBe(401);
    });

    it('should handle case-sensitive Bearer keyword', async () => {
      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `bearer ${adminToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'No token provided');
    });

    it('should handle very long token strings', async () => {
      const longToken = 'a'.repeat(10000);

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${longToken}`,
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid token');
    });

    it('should handle token with missing payload fields', async () => {
      const incompleteToken = jwt.sign(
        { userId: adminUserId }, // Missing email and roleId
        process.env.JWT_SECRET!,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${incompleteToken}`,
        },
      });

      // Should succeed but with incomplete user data
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should complete authentication within reasonable time', async () => {
      const startTime = Date.now();

      const response = await app.request('/protected', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        app.request('/protected', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

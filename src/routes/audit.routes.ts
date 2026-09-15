import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

const auditRouter = new Hono();

// Apply auth middleware to all routes
auditRouter.use('/*', authMiddleware);

// GET /api/audit - Get all audit logs (admin only)
auditRouter.get('/', requireRole(['admin']), async (c) => {
  try {
    const query = c.req.query();
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const offset = (page - 1) * limit;

    // Optional filters
    const userId = query.userId ? parseInt(query.userId) : undefined;
    const action = query.action;
    const entityType = query.entityType;
    const entityId = query.entityId ? parseInt(query.entityId) : undefined;
    const startDate = query.startDate;
    const endDate = query.endDate;

    // Build filter conditions
    const conditions: any[] = [];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }

    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
    }

    // Query with filters
    const logs = await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: auditLogs.id })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalCount = countResult[0]?.count || 0;

    // Parse JSON fields
    const logsWithParsedJson = logs.map(log => ({
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    }));

    return c.json({
      data: {
        logs: logsWithParsedJson,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return c.json(
      { error: 'Failed to fetch audit logs' },
      500
    );
  }
});

// GET /api/audit/:id - Get single audit log by ID (admin only)
auditRouter.get('/:id', requireRole(['admin']), async (c) => {
  try {
    const logIdParam = c.req.param('id');
    const logId = parseInt(logIdParam || '0');

    if (isNaN(logId)) {
      return c.json(
        { error: 'Invalid audit log ID' },
        400
      );
    }

    const [log] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, logId))
      .limit(1);

    if (!log) {
      return c.json(
        { error: 'Audit log not found' },
        404
      );
    }

    // Parse JSON fields
    const logWithParsedJson = {
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    };

    return c.json({
      data: {
        log: logWithParsedJson,
      },
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    return c.json(
      { error: 'Failed to fetch audit log' },
      500
    );
  }
});

// GET /api/audit/entity/:entityType/:entityId - Get audit logs for a specific entity (admin/manager)
auditRouter.get('/entity/:entityType/:entityId', requireRole(['admin', 'manager']), async (c) => {
  try {
    const entityType = c.req.param('entityType') || '';
    const entityIdParam = c.req.param('entityId');
    const entityId = parseInt(entityIdParam || '0');

    if (isNaN(entityId)) {
      return c.json(
        { error: 'Invalid entity ID' },
        400
      );
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.createdAt));

    // Parse JSON fields
    const logsWithParsedJson = logs.map(log => ({
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    }));

    return c.json({
      data: {
        logs: logsWithParsedJson,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    return c.json(
      { error: 'Failed to fetch entity audit logs' },
      500
    );
  }
});

// GET /api/audit/user/:userId - Get audit logs for a specific user (admin only)
auditRouter.get('/user/:userId', requireRole(['admin']), async (c) => {
  try {
    const userIdParam = c.req.param('userId');
    const userId = parseInt(userIdParam || '0');

    if (isNaN(userId)) {
      return c.json(
        { error: 'Invalid user ID' },
        400
      );
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt));

    // Parse JSON fields
    const logsWithParsedJson = logs.map(log => ({
      ...log,
      oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
    }));

    return c.json({
      data: {
        logs: logsWithParsedJson,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error('Get user audit logs error:', error);
    return c.json(
      { error: 'Failed to fetch user audit logs' },
      500
    );
  }
});

export default auditRouter;

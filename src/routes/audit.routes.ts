import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { auditLogs, users } from '../db/schema.js';
import { desc, eq, and, gte, lte, count, sql } from 'drizzle-orm';

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

    // Query with filters and join with users table
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: count() })
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

// GET /api/audit/stats - Get audit log statistics (admin only)
auditRouter.get('/stats', requireRole(['admin']), async (c) => {
  try {
    const query = c.req.query();
    const days = parseInt(query.days || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total logs count
    const totalLogsResult = await db
      .select({ count: count() })
      .from(auditLogs);

    // Get logs in time period
    const periodLogsResult = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate));

    // Get logs by action
    const logsByAction = await db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate))
      .groupBy(auditLogs.action);

    // Get logs by entity type
    const logsByEntityType = await db
      .select({
        entityType: auditLogs.entityType,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate))
      .groupBy(auditLogs.entityType);

    // Get most active users
    const mostActiveUsers = await db
      .select({
        userId: auditLogs.userId,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email,
        count: count(),
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(
        gte(auditLogs.createdAt, startDate),
        sql`${auditLogs.userId} IS NOT NULL`
      ))
      .groupBy(auditLogs.userId, users.firstName, users.lastName, users.email)
      .orderBy(desc(count()))
      .limit(10);

    // Get recent activity by day
    const activityByDay = await db
      .select({
        date: sql<string>`DATE(${auditLogs.createdAt})`,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate))
      .groupBy(sql`DATE(${auditLogs.createdAt})`)
      .orderBy(sql`DATE(${auditLogs.createdAt})`);

    return c.json({
      data: {
        period: `Last ${days} days`,
        totalLogs: totalLogsResult[0]?.count || 0,
        periodLogs: periodLogsResult[0]?.count || 0,
        byAction: logsByAction,
        byEntityType: logsByEntityType,
        mostActiveUsers,
        activityByDay,
      },
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    return c.json(
      { error: 'Failed to fetch audit statistics' },
      500
    );
  }
});

// GET /api/audit/actions - Get available audit actions (admin only)
auditRouter.get('/actions', requireRole(['admin']), async (c) => {
  try {
    const actions = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action);

    return c.json({
      data: {
        actions: actions.map(a => a.action),
      },
    });
  } catch (error) {
    console.error('Get audit actions error:', error);
    return c.json(
      { error: 'Failed to fetch audit actions' },
      500
    );
  }
});

// GET /api/audit/entity-types - Get available entity types (admin only)
auditRouter.get('/entity-types', requireRole(['admin']), async (c) => {
  try {
    const entityTypes = await db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs)
      .orderBy(auditLogs.entityType);

    return c.json({
      data: {
        entityTypes: entityTypes.map(e => e.entityType),
      },
    });
  } catch (error) {
    console.error('Get entity types error:', error);
    return c.json(
      { error: 'Failed to fetch entity types' },
      500
    );
  }
});

export default auditRouter;

# Audit Logging System Documentation

## Overview

The audit logging system tracks all important actions performed in the NAASCO application, providing a complete audit trail for compliance, security, and debugging purposes.

---

## Database Schema

### Table: `audit_logs`

```sql
CREATE TABLE `audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int,                           -- Who performed the action
  `action` varchar(20) NOT NULL,           -- CREATE/UPDATE/DELETE/LOGIN/APPROVE etc.
  `entity_type` varchar(50) NOT NULL,      -- 'loan','savings','member','user'
  `entity_id` int,                         -- Primary key of affected record
  `old_values` text,                       -- JSON string of old values (null for CREATE)
  `new_values` text,                       -- JSON string of new values (null for DELETE)
  `ip_address` varchar(45),                -- IPv4 or IPv6 address
  `user_agent` text,                       -- Browser/client user agent
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);

-- Indexes for fast querying
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);
CREATE INDEX `idx_audit_user` ON `audit_logs` (`user_id`,`created_at`);
CREATE INDEX `idx_audit_created` ON `audit_logs` (`created_at`);
```

### Drizzle Schema

File: `src/db/schema.ts`

```typescript
export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: int('id').autoincrement().primaryKey(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 20 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: int('entity_id'),
    oldValues: text('old_values'),
    newValues: text('new_values'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
    userIdx: index('idx_audit_user').on(table.userId, table.createdAt),
    createdIdx: index('idx_audit_created').on(table.createdAt),
  })
);
```

---

## Audit Actions

```typescript
enum AuditAction {
  CREATE = 'CREATE',    // New record created
  UPDATE = 'UPDATE',    // Record updated
  DELETE = 'DELETE',    // Record deleted
  LOGIN = 'LOGIN',      // User logged in
  LOGOUT = 'LOGOUT',    // User logged out
  APPROVE = 'APPROVE',  // Approval action (e.g., loan approval)
  REJECT = 'REJECT',    // Rejection action
  SUBMIT = 'SUBMIT',    // Submission action
  VIEW = 'VIEW',        // Record viewed (for sensitive data)
}
```

## Entity Types

```typescript
enum AuditEntityType {
  LOAN = 'loan',
  SAVINGS = 'savings',
  MEMBER = 'member',
  USER = 'user',
  ROLE = 'role',
  PAYMENT = 'payment',
  WITHDRAWAL = 'withdrawal',
}
```

---

## Utility Functions

### File: `src/utils/audit.utils.ts`

#### 1. `createAuditLog(data: AuditLogData)`

Creates an audit log entry.

```typescript
import { createAuditLog, AuditAction, AuditEntityType } from '../utils/audit.utils.js';

await createAuditLog({
  userId: 1,
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.MEMBER,
  entityId: 4,
  oldValues: { firstName: 'John', lastName: 'Doe' },
  newValues: { firstName: 'Jane', lastName: 'Doe' },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

#### 2. `auditFromContext(c, data)`

Automatically extracts IP address and user agent from Hono context.

```typescript
import { auditFromContext, AuditAction, AuditEntityType } from '../utils/audit.utils.js';

// In your route handler
await auditFromContext(c, {
  userId: authUser.userId,
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.MEMBER,
  entityId: memberId,
  oldValues: oldMember,
  newValues: updatedMember
});
```

#### 3. `sanitizeForAudit(data, sensitiveFields?)`

Removes sensitive data before logging.

```typescript
import { sanitizeForAudit } from '../utils/audit.utils.js';

const sanitized = sanitizeForAudit(
  { email: 'user@example.com', password: 'secret123' },
  ['password', 'token']
);
// Result: { email: 'user@example.com', password: '[REDACTED]' }
```

#### 4. `getChangedFields(oldData, newData)`

Captures only changed fields for UPDATE actions.

```typescript
import { getChangedFields } from '../utils/audit.utils.js';

const changes = getChangedFields(
  { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  { firstName: 'Jane', lastName: 'Doe', email: 'john@example.com' }
);
// Result: {
//   old: { firstName: 'John' },
//   new: { firstName: 'Jane' }
// }
```

---

## Implementation Examples

### Example 1: Create Member (with Audit)

```typescript
import { auditFromContext, AuditAction, AuditEntityType, sanitizeForAudit } from '../utils/audit.utils.js';

membersRouter.post('/', requireRole(['admin', 'manager']), async (c) => {
  // ... create member logic ...
  
  const [createdUser] = await db.insert(users).values(userData).$returningId();
  
  // Audit log: Member created
  const authUser = c.get('user');
  await auditFromContext(c, {
    userId: authUser?.userId,
    action: AuditAction.CREATE,
    entityType: AuditEntityType.MEMBER,
    entityId: createdUser.id,
    newValues: sanitizeForAudit(createdUser), // Removes password
  });
  
  return c.json({ data: { member: createdUser } }, 201);
});
```

### Example 2: Update Member (with Audit)

```typescript
membersRouter.put('/:id', requireRole(['admin', 'manager']), async (c) => {
  const memberId = parseInt(c.req.param('id'));
  
  // Get existing data
  const [existingUser] = await db.select().from(users).where(eq(users.id, memberId));
  
  // ... update logic ...
  await db.update(users).set(updateData).where(eq(users.id, memberId));
  
  // Get updated data
  const [updatedUser] = await db.select().from(users).where(eq(users.id, memberId));
  
  // Audit log: Member updated
  const authUser = c.get('user');
  await auditFromContext(c, {
    userId: authUser?.userId,
    action: AuditAction.UPDATE,
    entityType: AuditEntityType.MEMBER,
    entityId: memberId,
    oldValues: sanitizeForAudit(existingUser),
    newValues: sanitizeForAudit(updatedUser),
  });
  
  return c.json({ data: { member: updatedUser } });
});
```

### Example 3: Delete Member (with Audit)

```typescript
membersRouter.delete('/:id', requireRole(['admin']), async (c) => {
  const memberId = parseInt(c.req.param('id'));
  
  // Get existing data before deletion
  const [existingUser] = await db.select().from(users).where(eq(users.id, memberId));
  
  // Delete
  await db.delete(users).where(eq(users.id, memberId));
  
  // Audit log: Member deleted
  const authUser = c.get('user');
  await auditFromContext(c, {
    userId: authUser.userId,
    action: AuditAction.DELETE,
    entityType: AuditEntityType.MEMBER,
    entityId: memberId,
    oldValues: sanitizeForAudit(existingUser),
  });
  
  return c.json({ message: 'Member deleted successfully' });
});
```

---

## API Endpoints

### File: `src/routes/audit.routes.ts`

All endpoints require authentication and admin role (except entity-specific which allows manager).

#### 1. GET `/api/audit` - Get All Audit Logs (Paginated)

**Permissions:** Admin only

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action (CREATE, UPDATE, DELETE, etc.)
- `entityType` (optional): Filter by entity type (member, loan, savings, etc.)
- `entityId` (optional): Filter by entity ID
- `startDate` (optional): Filter by start date (ISO format)
- `endDate` (optional): Filter by end date (ISO format)

**Response:**
```json
{
  "data": {
    "logs": [
      {
        "id": 1,
        "userId": 1,
        "action": "UPDATE",
        "entityType": "member",
        "entityId": 4,
        "oldValues": { "firstName": "John" },
        "newValues": { "firstName": "Jane" },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

**Example:**
```bash
GET /api/audit?page=1&limit=20&entityType=member&action=UPDATE
```

#### 2. GET `/api/audit/:id` - Get Single Audit Log

**Permissions:** Admin only

**Response:**
```json
{
  "data": {
    "log": {
      "id": 1,
      "userId": 1,
      "action": "CREATE",
      "entityType": "member",
      "entityId": 5,
      "oldValues": null,
      "newValues": { "email": "new@example.com", "firstName": "New" },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

#### 3. GET `/api/audit/entity/:entityType/:entityId` - Get Logs for Entity

**Permissions:** Admin, Manager

Get all audit logs for a specific entity (e.g., all changes to member #4).

**Example:**
```bash
GET /api/audit/entity/member/4
```

**Response:**
```json
{
  "data": {
    "logs": [
      {
        "id": 1,
        "action": "CREATE",
        "createdAt": "2024-01-01T10:00:00.000Z"
      },
      {
        "id": 2,
        "action": "UPDATE",
        "oldValues": { "email": "old@example.com" },
        "newValues": { "email": "new@example.com" },
        "createdAt": "2024-01-02T15:30:00.000Z"
      }
    ],
    "total": 2
  }
}
```

#### 4. GET `/api/audit/user/:userId` - Get Logs for User

**Permissions:** Admin only

Get all actions performed by a specific user.

**Example:**
```bash
GET /api/audit/user/1
```

---

## Query Examples

### Get all member updates in the last 7 days
```bash
GET /api/audit?entityType=member&action=UPDATE&startDate=2024-01-01&endDate=2024-01-07
```

### Get all actions by user #1
```bash
GET /api/audit/user/1
```

### Get history of member #4
```bash
GET /api/audit/entity/member/4
```

### Get all deletions
```bash
GET /api/audit?action=DELETE
```

---

## Migration

Run the migration to create the audit_logs table:

```bash
npm run db:generate  # Generate migration
npm run db:migrate   # Run migration
```

---

## Best Practices

1. **Always use `auditFromContext()`** - Automatically captures IP and user agent
2. **Always use `sanitizeForAudit()`** - Removes passwords and sensitive data
3. **Log after success** - Only log when the operation actually succeeds
4. **Don't throw on audit failure** - Audit failures shouldn't break main operations
5. **Use `getChangedFields()`** - For UPDATE actions, only log what changed
6. **Log before DELETE** - Capture old values before record is deleted

---

## Security Considerations

1. **Passwords are redacted** - `sanitizeForAudit()` automatically removes password fields
2. **IP tracking** - Helps identify suspicious activity from unusual locations
3. **User agent tracking** - Helps identify automated attacks
4. **Immutable logs** - Audit logs should never be updated or deleted (only create)
5. **Access control** - Only admins can view full audit logs

---

## Performance

- **Indexed queries** - All common query patterns are indexed
- **Async logging** - Audit operations don't block main operations
- **Failed audits don't crash** - Errors are logged but don't throw
- **Pagination** - Large result sets are paginated

---

## Compliance

This audit system helps meet compliance requirements for:
- **SOC 2** - Change tracking and access logs
- **GDPR** - Data processing records
- **PCI DSS** - Access control and monitoring
- **HIPAA** - Audit trails for sensitive data

---

## Future Enhancements

Potential additions:
- [ ] Real-time audit log streaming
- [ ] Audit log export (CSV, JSON)
- [ ] Automated alerts for suspicious activity
- [ ] Audit log retention policies
- [ ] Archive old logs to separate storage
- [ ] Advanced search and filtering UI

---

## Testing

Example test file: `api-tests-audit.http`

```http
### Login first
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@naasco.com",
  "password": "admin123"
}

### Get all audit logs
GET http://localhost:3001/api/audit?page=1&limit=20
Authorization: Bearer YOUR_TOKEN

### Get audit logs for a specific member
GET http://localhost:3001/api/audit/entity/member/4
Authorization: Bearer YOUR_TOKEN

### Get audit logs for a specific user
GET http://localhost:3001/api/audit/user/1
Authorization: Bearer YOUR_TOKEN
```

---

## Summary

✅ **Database schema created** with proper indexes
✅ **Utility functions** for easy audit logging
✅ **Integrated into members routes** (CREATE, UPDATE, DELETE)
✅ **API endpoints** for querying audit logs
✅ **Security** - passwords redacted, access controlled
✅ **Performance** - indexed queries, async operations
✅ **Documentation** - complete usage examples

The audit system is production-ready and can be easily extended to other entities (loans, savings, etc.).

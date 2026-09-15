# Audit Logging - Quick Reference

## 🚀 Quick Start

### 1. Run Migration
```bash
npm run db:migrate
```

### 2. Import in Your Route
```typescript
import { auditFromContext, AuditAction, AuditEntityType, sanitizeForAudit } from '../utils/audit.utils.js';
```

### 3. Add Audit Log
```typescript
await auditFromContext(c, {
  userId: authUser.userId,
  action: AuditAction.CREATE,
  entityType: AuditEntityType.MEMBER,
  entityId: newRecord.id,
  newValues: sanitizeForAudit(newRecord),
});
```

---

## 📝 Common Patterns

### CREATE Action
```typescript
// After creating record
await auditFromContext(c, {
  userId: authUser.userId,
  action: AuditAction.CREATE,
  entityType: AuditEntityType.MEMBER,
  entityId: createdRecord.id,
  newValues: sanitizeForAudit(createdRecord),
});
```

### UPDATE Action
```typescript
// Get old data first
const [oldData] = await db.select().from(table).where(eq(table.id, id));

// Perform update
await db.update(table).set(updateData).where(eq(table.id, id));

// Get new data
const [newData] = await db.select().from(table).where(eq(table.id, id));

// Log the change
await auditFromContext(c, {
  userId: authUser.userId,
  action: AuditAction.UPDATE,
  entityType: AuditEntityType.MEMBER,
  entityId: id,
  oldValues: sanitizeForAudit(oldData),
  newValues: sanitizeForAudit(newData),
});
```

### DELETE Action
```typescript
// Get data before deletion
const [existingData] = await db.select().from(table).where(eq(table.id, id));

// Delete
await db.delete(table).where(eq(table.id, id));

// Log deletion
await auditFromContext(c, {
  userId: authUser.userId,
  action: AuditAction.DELETE,
  entityType: AuditEntityType.MEMBER,
  entityId: id,
  oldValues: sanitizeForAudit(existingData),
});
```

---

## 🔍 Query Examples

### Get All Logs
```bash
GET /api/audit?page=1&limit=50
```

### Filter by Entity Type
```bash
GET /api/audit?entityType=member
```

### Filter by Action
```bash
GET /api/audit?action=UPDATE
```

### Get Entity History
```bash
GET /api/audit/entity/member/4
```

### Get User Activity
```bash
GET /api/audit/user/1
```

### Date Range Query
```bash
GET /api/audit?startDate=2024-01-01&endDate=2024-01-31
```

### Combined Filters
```bash
GET /api/audit?entityType=member&action=UPDATE&userId=1&page=1&limit=20
```

---

## 📊 Actions

```typescript
AuditAction.CREATE    // New record created
AuditAction.UPDATE    // Record updated
AuditAction.DELETE    // Record deleted
AuditAction.LOGIN     // User logged in
AuditAction.LOGOUT    // User logged out
AuditAction.APPROVE   // Approval action
AuditAction.REJECT    // Rejection action
AuditAction.SUBMIT    // Submission action
AuditAction.VIEW      // Viewing sensitive data
```

## 🏷️ Entity Types

```typescript
AuditEntityType.MEMBER      // member
AuditEntityType.USER        // user
AuditEntityType.LOAN        // loan
AuditEntityType.SAVINGS     // savings
AuditEntityType.PAYMENT     // payment
AuditEntityType.WITHDRAWAL  // withdrawal
AuditEntityType.ROLE        // role
```

---

## 🛠️ Utility Functions

| Function | Purpose |
|----------|---------|
| `auditFromContext(c, data)` | Create audit log with auto IP/user agent |
| `createAuditLog(data)` | Create audit log manually |
| `sanitizeForAudit(data, fields?)` | Remove sensitive fields |
| `getChangedFields(old, new)` | Get only changed fields |
| `getIpAddress(request)` | Extract IP from request |
| `getUserAgent(request)` | Extract user agent from request |

---

## 🔒 Security

✅ **Always use `sanitizeForAudit()`** - Removes passwords automatically
```typescript
const safe = sanitizeForAudit(userData);
// Removes: password, token, secret, apiKey
```

✅ **Add custom sensitive fields**
```typescript
const safe = sanitizeForAudit(data, ['password', 'ssn', 'creditCard']);
```

---

## 📦 Response Format

```json
{
  "data": {
    "log": {
      "id": 1,
      "userId": 1,
      "action": "UPDATE",
      "entityType": "member",
      "entityId": 4,
      "oldValues": { "firstName": "John" },
      "newValues": { "firstName": "Jane" },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

---

## ⚡ Performance Tips

1. **Use indexes** - Already created for common queries
2. **Don't throw on failure** - Audit failures are logged but don't crash
3. **Log after success** - Only log when operation succeeds
4. **Use pagination** - Large result sets are paginated by default

---

## 🎯 Best Practices

✅ **DO:**
- Use `auditFromContext()` for automatic IP/user agent
- Use `sanitizeForAudit()` to remove passwords
- Log after operation succeeds
- Capture old values before DELETE
- Use `getChangedFields()` for UPDATE to log only changes

❌ **DON'T:**
- Don't log passwords or tokens
- Don't throw errors if audit fails
- Don't log before operation succeeds
- Don't update or delete audit logs

---

## 🧪 Testing

```http
### 1. Login
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@naasco.com",
  "password": "admin123"
}

### 2. Get Audit Logs
GET http://localhost:3001/api/audit?page=1&limit=20
Authorization: Bearer YOUR_TOKEN

### 3. Get Member History
GET http://localhost:3001/api/audit/entity/member/4
Authorization: Bearer YOUR_TOKEN

### 4. Get User Activity
GET http://localhost:3001/api/audit/user/1
Authorization: Bearer YOUR_TOKEN
```

---

## 🚨 Troubleshooting

### Audit log not created?
- Check if operation succeeded before audit call
- Check console for audit errors (non-blocking)
- Verify user is authenticated

### Can't query audit logs?
- Check authentication token is valid
- Verify user has admin role
- Check endpoint URL is correct

### Old/new values are null?
- Verify `sanitizeForAudit()` is called
- Check if values exist before sanitizing
- Confirm JSON serialization works

---

## 📚 Full Documentation

See `AUDIT_LOGGING.md` for complete documentation with detailed examples.

---

## 💡 Quick Tips

- **Auto capture IP:** `auditFromContext()` does it automatically
- **Remove passwords:** `sanitizeForAudit()` handles it
- **Track changes only:** Use `getChangedFields()` for efficient UPDATE logs
- **Filter queries:** Use URL params to filter results
- **Paginate results:** Default 50 per page, customize with `limit`

---

## 🎉 You're Ready!

1. Run migration: `npm run db:migrate`
2. Import utils in your routes
3. Add `await auditFromContext(...)` after operations
4. Query via `/api/audit` endpoints

That's it! Your audit logging is ready to track everything. 🚀

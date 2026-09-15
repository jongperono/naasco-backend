import { db } from '../db/index.js';
import { auditLogs, type NewAuditLog } from '../db/schema.js';

/**
 * Audit action types
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  VIEW = 'VIEW',
}

/**
 * Entity types to audit
 */
export enum AuditEntityType {
  LOAN = 'loan',
  SAVINGS = 'savings',
  MEMBER = 'member',
  USER = 'user',
  ROLE = 'role',
  PAYMENT = 'payment',
  WITHDRAWAL = 'withdrawal',
}

/**
 * Audit log data structure
 */
export interface AuditLogData {
  userId?: number | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Create an audit log entry
 * 
 * @param data - Audit log data
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * await createAuditLog({
 *   userId: 1,
 *   action: AuditAction.UPDATE,
 *   entityType: AuditEntityType.MEMBER,
 *   entityId: 4,
 *   oldValues: { firstName: 'John', lastName: 'Doe' },
 *   newValues: { firstName: 'Jane', lastName: 'Doe' },
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 * ```
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const auditData: NewAuditLog = {
      userId: data.userId || null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    };

    await db.insert(auditLogs).values(auditData);
  } catch (error) {
    // Log error but don't throw - audit failures shouldn't break the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Helper to extract IP address from request
 * Supports X-Forwarded-For header for proxied requests
 * 
 * @param request - Hono request object
 * @returns IP address or null
 */
export function getIpAddress(request: any): string | null {
  try {
    // Check X-Forwarded-For header (for proxied requests)
    const forwardedFor = request.header('x-forwarded-for');
    if (forwardedFor) {
      // Take the first IP if multiple are present
      return forwardedFor.split(',')[0].trim();
    }

    // Check X-Real-IP header
    const realIp = request.header('x-real-ip');
    if (realIp) {
      return realIp;
    }

    // Fallback to direct connection IP (if available)
    // Note: This may not be available in all Hono setups
    return null;
  } catch (error) {
    console.error('Failed to extract IP address:', error);
    return null;
  }
}

/**
 * Helper to extract user agent from request
 * 
 * @param request - Hono request object
 * @returns User agent string or null
 */
export function getUserAgent(request: any): string | null {
  try {
    return request.header('user-agent') || null;
  } catch (error) {
    console.error('Failed to extract user agent:', error);
    return null;
  }
}

/**
 * Helper to create audit log from Hono context
 * Automatically extracts IP address and user agent
 * 
 * @param c - Hono context
 * @param data - Audit log data (without IP and user agent)
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * // In your route handler
 * await auditFromContext(c, {
 *   userId: authUser.userId,
 *   action: AuditAction.UPDATE,
 *   entityType: AuditEntityType.MEMBER,
 *   entityId: memberId,
 *   oldValues: oldMember,
 *   newValues: updatedMember
 * });
 * ```
 */
export async function auditFromContext(
  c: any,
  data: Omit<AuditLogData, 'ipAddress' | 'userAgent'>
): Promise<void> {
  const ipAddress = getIpAddress(c.req);
  const userAgent = getUserAgent(c.req);

  await createAuditLog({
    ...data,
    ipAddress,
    userAgent,
  });
}

/**
 * Sanitize sensitive data before logging
 * Removes passwords and other sensitive fields
 * 
 * @param data - Data object to sanitize
 * @param sensitiveFields - Array of field names to remove (default: ['password'])
 * @returns Sanitized data object
 */
export function sanitizeForAudit(
  data: Record<string, any>,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey']
): Record<string, any> {
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Diff two objects to capture only changed fields
 * Useful for UPDATE actions to log only what changed
 * 
 * @param oldData - Original data
 * @param newData - Updated data
 * @returns Object containing only changed fields from both old and new data
 * 
 * @example
 * ```typescript
 * const changes = getChangedFields(
 *   { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
 *   { firstName: 'Jane', lastName: 'Doe', email: 'john@example.com' }
 * );
 * // Result: {
 * //   old: { firstName: 'John' },
 * //   new: { firstName: 'Jane' }
 * // }
 * ```
 */
export function getChangedFields(
  oldData: Record<string, any>,
  newData: Record<string, any>
): { old: Record<string, any>; new: Record<string, any> } {
  const oldChanges: Record<string, any> = {};
  const newChanges: Record<string, any> = {};

  // Check all keys in newData
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      oldChanges[key] = oldData[key];
      newChanges[key] = newData[key];
    }
  }

  // Check for deleted keys (present in old but not in new)
  for (const key in oldData) {
    if (!(key in newData)) {
      oldChanges[key] = oldData[key];
      newChanges[key] = null;
    }
  }

  return { old: oldChanges, new: newChanges };
}

import { db } from '../db/index.js';
import type { NewAuditLog } from '../db/schema.js';
import { auditLogs } from '../db/schema.js';

/**
 * Utility functions for audit logging
 */

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'VIEW' | 'EXPORT';

export type AuditEntityType =
  | 'user'
  | 'member'
  | 'role'
  | 'loan'
  | 'savings'
  | 'transaction'
  | 'payment'
  | 'setting'
  | 'report';

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
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const logEntry: NewAuditLog = {
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };

    await db.insert(auditLogs).values(logEntry);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Extract IP address from request headers
 */
export function getIpAddress(headers: Record<string, string | undefined>): string | undefined {
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['x-real-ip'] ||
    headers['cf-connecting-ip'] ||
    undefined
  );
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Record<string, string | undefined>): string | undefined {
  return headers['user-agent'];
}

/**
 * Sanitize sensitive fields from objects before logging
 */
export function sanitizeForAudit(obj: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Compare two objects and return only the changed fields
 */
export function getChangedFields(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): { old: Record<string, any>; new: Record<string, any> } {
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  for (const key of Object.keys(newObj)) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      oldValues[key] = oldObj[key];
      newValues[key] = newObj[key];
    }
  }

  return {
    old: sanitizeForAudit(oldValues),
    new: sanitizeForAudit(newValues),
  };
}

/**
 * Create audit log for CREATE operations
 */
export async function logCreate(
  userId: number | null | undefined,
  entityType: AuditEntityType,
  entityId: number,
  newValues: Record<string, any>,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId: userId ?? null,
    action: 'CREATE',
    entityType,
    entityId,
    newValues: sanitizeForAudit(newValues),
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/**
 * Create audit log for UPDATE operations
 */
export async function logUpdate(
  userId: number | null | undefined,
  entityType: AuditEntityType,
  entityId: number,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  const changes = getChangedFields(oldValues, newValues);

  // Only log if there are actual changes
  if (Object.keys(changes.new).length > 0) {
    await createAuditLog({
      userId: userId ?? null,
      action: 'UPDATE',
      entityType,
      entityId,
      oldValues: changes.old,
      newValues: changes.new,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });
  }
}

/**
 * Create audit log for DELETE operations
 */
export async function logDelete(
  userId: number | null | undefined,
  entityType: AuditEntityType,
  entityId: number,
  oldValues: Record<string, any>,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId: userId ?? null,
    action: 'DELETE',
    entityType,
    entityId,
    oldValues: sanitizeForAudit(oldValues),
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/**
 * Create audit log for LOGIN operations
 */
export async function logLogin(
  userId: number,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'LOGIN',
    entityType: 'user',
    entityId: userId,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/**
 * Create audit log for LOGOUT operations
 */
export async function logLogout(
  userId: number,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'LOGOUT',
    entityType: 'user',
    entityId: userId,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/**
 * Create audit log for VIEW operations (for sensitive data)
 */
export async function logView(
  userId: number | null | undefined,
  entityType: AuditEntityType,
  entityId: number,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId: userId ?? null,
    action: 'VIEW',
    entityType,
    entityId,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

/**
 * Create audit log for EXPORT operations
 */
export async function logExport(
  userId: number | null | undefined,
  entityType: AuditEntityType,
  filters?: Record<string, any>,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId: userId ?? null,
    action: 'EXPORT',
    entityType,
    newValues: filters ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}

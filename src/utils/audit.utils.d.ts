/**
 * Utility functions for audit logging
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'VIEW' | 'EXPORT';
export type AuditEntityType = 'user' | 'member' | 'role' | 'loan' | 'savings' | 'transaction' | 'payment' | 'setting' | 'report';
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
export declare function createAuditLog(data: AuditLogData): Promise<void>;
/**
 * Extract IP address from request headers
 */
export declare function getIpAddress(headers: Record<string, string | undefined>): string | undefined;
/**
 * Get user agent from request headers
 */
export declare function getUserAgent(headers: Record<string, string | undefined>): string | undefined;
/**
 * Sanitize sensitive fields from objects before logging
 */
export declare function sanitizeForAudit(obj: Record<string, any>): Record<string, any>;
/**
 * Compare two objects and return only the changed fields
 */
export declare function getChangedFields(oldObj: Record<string, any>, newObj: Record<string, any>): {
    old: Record<string, any>;
    new: Record<string, any>;
};
/**
 * Create audit log for CREATE operations
 */
export declare function logCreate(userId: number | null | undefined, entityType: AuditEntityType, entityId: number, newValues: Record<string, any>, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
/**
 * Create audit log for UPDATE operations
 */
export declare function logUpdate(userId: number | null | undefined, entityType: AuditEntityType, entityId: number, oldValues: Record<string, any>, newValues: Record<string, any>, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
/**
 * Create audit log for DELETE operations
 */
export declare function logDelete(userId: number | null | undefined, entityType: AuditEntityType, entityId: number, oldValues: Record<string, any>, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
/**
 * Create audit log for LOGIN operations
 */
export declare function logLogin(userId: number, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
/**
 * Create audit log for LOGOUT operations
 */
export declare function logLogout(userId: number, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
/**
 * Create audit log for VIEW operations (for sensitive data)
 */
export declare function logView(userId: number | null | undefined, entityType: AuditEntityType, entityId: number, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
/**
 * Create audit log for EXPORT operations
 */
export declare function logExport(userId: number | null | undefined, entityType: AuditEntityType, filters?: Record<string, any>, ipAddress?: string | null, userAgent?: string | null): Promise<void>;
//# sourceMappingURL=audit.utils.d.ts.map
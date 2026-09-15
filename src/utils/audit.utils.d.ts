/**
 * Audit action types
 */
export declare enum AuditAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    APPROVE = "APPROVE",
    REJECT = "REJECT",
    SUBMIT = "SUBMIT",
    VIEW = "VIEW"
}
/**
 * Entity types to audit
 */
export declare enum AuditEntityType {
    LOAN = "loan",
    SAVINGS = "savings",
    MEMBER = "member",
    USER = "user",
    ROLE = "role",
    PAYMENT = "payment",
    WITHDRAWAL = "withdrawal"
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
export declare function createAuditLog(data: AuditLogData): Promise<void>;
/**
 * Helper to extract IP address from request
 * Supports X-Forwarded-For header for proxied requests
 *
 * @param request - Hono request object
 * @returns IP address or null
 */
export declare function getIpAddress(request: any): string | null;
/**
 * Helper to extract user agent from request
 *
 * @param request - Hono request object
 * @returns User agent string or null
 */
export declare function getUserAgent(request: any): string | null;
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
export declare function auditFromContext(c: any, data: Omit<AuditLogData, 'ipAddress' | 'userAgent'>): Promise<void>;
/**
 * Sanitize sensitive data before logging
 * Removes passwords and other sensitive fields
 *
 * @param data - Data object to sanitize
 * @param sensitiveFields - Array of field names to remove (default: ['password'])
 * @returns Sanitized data object
 */
export declare function sanitizeForAudit(data: Record<string, any>, sensitiveFields?: string[]): Record<string, any>;
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
export declare function getChangedFields(oldData: Record<string, any>, newData: Record<string, any>): {
    old: Record<string, any>;
    new: Record<string, any>;
};
//# sourceMappingURL=audit.utils.d.ts.map
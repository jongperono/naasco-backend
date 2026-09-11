import type { Context, Next } from 'hono';
export interface AuthPayload {
    userId: number;
    email: string;
    roleId: number;
}
declare module 'hono' {
    interface ContextVariableMap {
        user: AuthPayload;
    }
}
/**
 * Middleware to verify JWT token and attach user to context
 */
export declare const authMiddleware: (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    error: string;
}, 401, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 404, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 403, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 500, "json">) | undefined>;
/**
 * Middleware to check if user has required role
 */
export declare const requireRole: (allowedRoles: string[]) => (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    error: string;
}, 401, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 404, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 403, "json">) | undefined>;
//# sourceMappingURL=auth.middleware.d.ts.map
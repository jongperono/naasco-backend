import type { Context } from 'hono';
/**
 * Standard API response utilities
 */
export interface SuccessResponse<T> {
    message?: string;
    data: T;
}
export interface ErrorResponse {
    error: string;
    details?: any;
}
/**
 * Send a successful response
 */
export declare const sendSuccess: <T>(c: Context, data: T, message?: string, statusCode?: number) => Response & import("hono").TypedResponse<string | T | undefined extends bigint | readonly bigint[] ? never : { [K in keyof {
    message?: string;
    data: T;
} as (SuccessResponse<T>[K] extends infer T_1 ? T_1 extends SuccessResponse<T>[K] ? T_1 extends import("hono/utils/types").InvalidJSONValue ? true : false : never : never) extends true ? never : K]: boolean extends (SuccessResponse<T>[K] extends infer T_2 ? T_2 extends SuccessResponse<T>[K] ? T_2 extends import("hono/utils/types").InvalidJSONValue ? true : false : never : never) ? import("hono/utils/types").JSONParsed<SuccessResponse<T>[K], bigint | readonly bigint[]> | undefined : import("hono/utils/types").JSONParsed<SuccessResponse<T>[K], bigint | readonly bigint[]>; }, any, "json">;
/**
 * Send an error response
 */
export declare const sendError: (c: Context, error: string, statusCode?: number, details?: any) => Response & import("hono").TypedResponse<{
    error: string;
    details?: any;
}, any, "json">;
/**
 * Common error responses
 */
export declare const ErrorResponses: {
    badRequest: (c: Context, message?: string, details?: any) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
    unauthorized: (c: Context, message?: string) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
    forbidden: (c: Context, message?: string) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
    notFound: (c: Context, message?: string) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
    conflict: (c: Context, message?: string) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
    validationError: (c: Context, details: any) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
    serverError: (c: Context, message?: string) => Response & import("hono").TypedResponse<{
        error: string;
        details?: any;
    }, any, "json">;
};
//# sourceMappingURL=response.utils.d.ts.map
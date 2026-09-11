/**
 * Environment variable validation utility
 * Validates critical environment variables at application startup
 */
/**
 * Validates all environment variables according to defined rules
 * Throws an error if validation fails, preventing application startup
 */
export declare function validateEnvironment(): void;
/**
 * Get validated JWT_SECRET
 * This function assumes validateEnvironment() has already been called
 */
export declare function getJwtSecret(): string;
/**
 * Get JWT expiration time with default fallback
 */
export declare function getJwtExpiresIn(): string;
//# sourceMappingURL=env.validation.d.ts.map
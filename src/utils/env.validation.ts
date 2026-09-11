/**
 * Environment variable validation utility
 * Validates critical environment variables at application startup
 */

interface ValidationRule {
  name: string;
  required: boolean;
  minLength?: number;
  validator?: (value: string) => { valid: boolean; error?: string };
}

const ENV_RULES: ValidationRule[] = [
  {
    name: 'JWT_SECRET',
    required: true,
    minLength: 32,
    validator: (value: string) => {
      if (value === 'default-secret' || value === 'your-super-secret-jwt-key-change-this-in-production') {
        return {
          valid: false,
          error: 'JWT_SECRET cannot use default or example values. Generate a secure random secret.',
        };
      }
      return { valid: true };
    },
  },
  {
    name: 'DATABASE_URL',
    required: true,
  },
  {
    name: 'JWT_EXPIRES_IN',
    required: false,
  },
  {
    name: 'BCRYPT_SALT_ROUNDS',
    required: false,
    validator: (value: string) => {
      const rounds = parseInt(value, 10);
      if (isNaN(rounds) || rounds < 10 || rounds > 15) {
        return {
          valid: false,
          error: 'BCRYPT_SALT_ROUNDS must be a number between 10 and 15',
        };
      }
      return { valid: true };
    },
  },
];

/**
 * Validates all environment variables according to defined rules
 * Throws an error if validation fails, preventing application startup
 */
export function validateEnvironment(): void {
  const errors: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.name];

    // Check if required variable is missing
    if (rule.required && (!value || value.trim() === '')) {
      errors.push(
        `❌ ${rule.name} is required but not set in environment variables.`
      );
      continue;
    }

    // Skip further validation if optional and not set
    if (!rule.required && !value) {
      continue;
    }

    // Check minimum length requirement
    if (rule.minLength && value && value.length < rule.minLength) {
      errors.push(
        `❌ ${rule.name} must be at least ${rule.minLength} characters long. Current length: ${value.length}`
      );
    }

    // Run custom validator if provided
    if (rule.validator && value) {
      const result = rule.validator(value);
      if (!result.valid) {
        errors.push(
          `❌ ${rule.name}: ${result.error}`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error('\n🚨 Environment Variable Validation Failed:\n');
    errors.forEach((error) => console.error(`  ${error}`));
    console.error('\n💡 Tips:');
    console.error('  - Check your .env file exists and is properly configured');
    console.error('  - Refer to .env.example for required variables');
    console.error('  - Generate a secure JWT_SECRET using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('\n');

    throw new Error('Environment validation failed. Application cannot start.');
  }

  console.log('✅ Environment variables validated successfully');
}

/**
 * Get validated JWT_SECRET
 * This function assumes validateEnvironment() has already been called
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    // This should never happen if validateEnvironment() was called
    throw new Error('JWT_SECRET is not available. This should not happen.');
  }
  
  return secret;
}

/**
 * Get JWT expiration time with default fallback
 */
export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

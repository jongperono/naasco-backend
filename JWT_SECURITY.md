# JWT Security Implementation

## Overview

This application implements secure JWT (JSON Web Token) authentication with the following security measures:

## Security Features

### 1. **Fail-Fast Startup Validation** ✅
The application validates all critical environment variables at startup and **refuses to start** if:
- `JWT_SECRET` is missing or empty
- `JWT_SECRET` is less than 32 characters (256 bits minimum for HS256)
- `JWT_SECRET` contains default or example values
- Other required environment variables are missing

**Implementation**: See `src/utils/env.validation.ts`

### 2. **Minimum Secret Strength** ✅
- JWT secrets must be **at least 32 characters** long
- This provides 256 bits of entropy, matching the HS256 algorithm strength
- Prevents brute-force attacks on the secret

### 3. **Algorithm Allowlisting** ✅
- Token verification explicitly specifies `algorithms: ['HS256']`
- Prevents algorithm confusion attacks (e.g., using public key as HMAC secret)
- Applied in both auth middleware and auth routes

**Implementation**: 
- `src/middleware/auth.middleware.ts`
- `src/routes/auth.routes.ts`

### 4. **No Insecure Fallbacks** ✅
- All `process.env.JWT_SECRET || 'default-secret'` patterns removed
- Uses centralized `getJwtSecret()` helper that assumes validation has occurred
- Application crashes immediately if JWT_SECRET is invalid

## Setup Instructions

### Generate a Secure JWT Secret

Run one of these commands to generate a cryptographically secure secret:

```bash
# Using Node.js (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Replace the `JWT_SECRET` value with your generated secret:
   ```env
   JWT_SECRET="your-generated-64-character-hex-string-here"
   ```

3. Ensure `JWT_SECRET` is **at least 32 characters long**

### Verify Configuration

Start the application:
```bash
npm run dev
```

If environment validation fails, you'll see detailed error messages:
```
🚨 Environment Variable Validation Failed:

  ❌ JWT_SECRET is required but not set in environment variables.
  ❌ JWT_SECRET must be at least 32 characters long. Current length: 16

💡 Tips:
  - Check your .env file exists and is properly configured
  - Refer to .env.example for required variables
  - Generate a secure JWT_SECRET using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Error: Environment validation failed. Application cannot start.
```

## Deployment Checklist

Before deploying to production:

- [ ] Generate a new, unique JWT_SECRET for each environment (dev, staging, prod)
- [ ] Never commit secrets to version control
- [ ] Store secrets in secure environment variable management (AWS Secrets Manager, Vault, etc.)
- [ ] Ensure JWT_SECRET is at least 32 characters
- [ ] Verify JWT_EXPIRES_IN is appropriate for your use case (shorter is more secure)
- [ ] Consider increasing BCRYPT_SALT_ROUNDS to 12-15 for production

## Docker/Container Deployment

### Docker Compose Example

```yaml
version: '3.8'
services:
  backend:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}  # Must be at least 32 characters
      - JWT_EXPIRES_IN=7d
      - BCRYPT_SALT_ROUNDS=12
    env_file:
      - .env  # Never commit this file
```

### Kubernetes Secret Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
type: Opaque
stringData:
  JWT_SECRET: "your-secure-64-character-secret-here"  # Must be 32+ chars
  DATABASE_URL: "mysql://user:pass@host:3306/db"
```

## Security Best Practices

### Token Expiration
- Default: 7 days
- Consider shorter expiration for sensitive operations
- Implement refresh tokens for better UX with short-lived access tokens

### Token Storage (Client-Side)
- **Never** store tokens in localStorage (vulnerable to XSS)
- Use httpOnly cookies when possible
- If using localStorage, implement additional XSS protections

### Algorithm Selection
- This implementation uses **HS256** (HMAC with SHA-256)
- Suitable for most applications where backend signs and verifies tokens
- For distributed systems, consider RS256 (RSA with SHA-256) with public/private keys

### Secret Rotation
- Plan to rotate JWT_SECRET periodically (e.g., every 90 days)
- Implement dual-secret verification during rotation to avoid disruption
- Invalidate all tokens when secret changes (users must re-authenticate)

## Troubleshooting

### Application won't start

**Error**: `JWT_SECRET is required but not set`
- **Solution**: Create a `.env` file with a valid `JWT_SECRET`

**Error**: `JWT_SECRET must be at least 32 characters long`
- **Solution**: Generate a longer secret using the commands above

**Error**: `JWT_SECRET cannot use default or example values`
- **Solution**: Replace the placeholder with a real cryptographic secret

### Invalid token errors

If users receive "Invalid token" errors after deployment:
- Verify `JWT_SECRET` matches the secret used to sign the tokens
- Check that tokens haven't expired
- Ensure no whitespace/newlines in `JWT_SECRET` environment variable

## References

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Auth0 JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

## Validation Rules Reference

Current environment validation rules (see `src/utils/env.validation.ts`):

| Variable | Required | Min Length | Custom Validation |
|----------|----------|------------|-------------------|
| `JWT_SECRET` | ✅ Yes | 32 chars | No default values |
| `DATABASE_URL` | ✅ Yes | - | - |
| `JWT_EXPIRES_IN` | ❌ No | - | - |
| `BCRYPT_SALT_ROUNDS` | ❌ No | - | 10-15 range |

## Testing

To test the validation:

1. **Test missing JWT_SECRET**:
   ```bash
   # Comment out JWT_SECRET in .env
   npm run dev
   # Should fail to start
   ```

2. **Test short JWT_SECRET**:
   ```bash
   # Set JWT_SECRET="short" in .env
   npm run dev
   # Should fail with length error
   ```

3. **Test with valid secret**:
   ```bash
   # Set a 64-character hex string
   npm run dev
   # Should start successfully with ✅ message
   ```

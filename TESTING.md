# Testing Guide

## Overview

This project uses Jest for testing the backend API endpoints. The tests are written in TypeScript and use `ts-jest` for transpilation.

## Setup

All test dependencies are already installed. The test configuration is in `jest.config.js`.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

Tests are organized in `__tests__` directories alongside the code they test:

```
src/
  routes/
    __tests__/
      auth.routes.test.ts    # Tests for login, register, and auth endpoints
    auth.routes.ts
```

## Login API Tests

The login API tests (`auth.routes.test.ts`) cover the following scenarios:

### Success Cases
- ✅ Successful login with valid credentials
- ✅ Returns valid JWT token
- ✅ Email case sensitivity handling

### Validation Errors
- ✅ Missing email
- ✅ Missing password
- ✅ Invalid email format
- ✅ Password too short (< 6 characters)
- ✅ Empty request body

### Authentication Errors
- ✅ Non-existent email
- ✅ Incorrect password
- ✅ Email existence information leakage prevention

### User Status
- ✅ Deactivated user cannot login

### Edge Cases
- ✅ Malformed JSON
- ✅ Whitespace handling in email
- ✅ Very long passwords
- ✅ SQL injection attempts
- ✅ Special characters in password

### Security Tests
- ✅ Password hash not returned in response
- ✅ Different tokens for different sessions
- ✅ JWT uses HS256 algorithm
- ✅ Token expiration validation

### Performance Tests
- ✅ Login completes within reasonable time

## Test Database

Tests use the same database as development by default. Make sure:

1. Your `.env` file is properly configured
2. Database migrations have been run
3. The `member` role exists in the database

### Environment Variables for Testing

Required variables (from `.env`):
- `DATABASE_URL` - Connection string to your test/dev database
- `JWT_SECRET` - Secret key for JWT (can use test value)
- `JWT_EXPIRES_IN` - Token expiration time (optional, defaults to '7d')
- `BCRYPT_SALT_ROUNDS` - Number of salt rounds for bcrypt (optional, defaults to 10)

## Writing New Tests

When adding new tests:

1. Create a `__tests__` directory next to the file you're testing
2. Name your test file `*.test.ts`
3. Import necessary dependencies:
   ```typescript
   import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
   ```
4. Set up test data in `beforeAll` and clean up in `afterAll`
5. Group related tests using `describe` blocks
6. Use clear, descriptive test names

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Descriptive Names**: Use clear test names that describe what is being tested
4. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
5. **Edge Cases**: Test both happy paths and error conditions
6. **Security**: Include security-focused tests for authentication and authorization

## Continuous Integration

Tests should be run as part of your CI/CD pipeline before deploying to production.

## Troubleshooting

### Tests timing out
- Increase the timeout in `jest.config.js` or individual tests
- Check database connection and network

### Database connection errors
- Verify `.env` configuration
- Ensure database is running and accessible
- Check database credentials

### Import errors
- Ensure all imports use `.js` extensions for ESM compatibility
- Check `moduleNameMapper` in `jest.config.js`

## Coverage Reports

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.

Target coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

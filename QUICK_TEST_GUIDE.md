# Quick Test Guide 🚀

## Run Tests

```bash
# Run all tests
npm test

# Run in watch mode (auto-rerun on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

## Test Status

✅ **All 21 tests passing**

## What's Tested

- ✅ Successful login with valid credentials
- ✅ JWT token generation and validation
- ✅ Input validation (email, password, etc.)
- ✅ Authentication errors (wrong email/password)
- ✅ Inactive user account handling
- ✅ Edge cases (malformed JSON, SQL injection, etc.)
- ✅ Security (password protection, token uniqueness)
- ✅ Performance (response time < 5 seconds)

## Test Location

```
src/routes/__tests__/auth.routes.test.ts
```

## Prerequisites

✓ Dependencies installed (already done)
✓ Database running
✓ .env file configured
✓ `member` role exists in database

## Common Issues

### Tests hang?
- Tests use `--forceExit` flag automatically
- Database connections are properly closed

### Database errors?
- Check your `.env` file
- Ensure database is running
- Verify `member` role exists

### Import errors?
- Already configured for ESM
- TypeScript 5.7.2 installed

## Coverage

Run `npm run test:coverage` to see detailed coverage report.

## Documentation

- **README_TESTS.md** - Full implementation details
- **TESTING.md** - Testing best practices
- **TEST_SUMMARY.md** - Test results summary

---

Need help? Check the documentation files above!

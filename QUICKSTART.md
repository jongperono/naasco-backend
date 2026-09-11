# Quick Start Guide

Get the NAASCO Backend API up and running in 5 minutes.

## Prerequisites

- ✅ Node.js (v18 or higher)
- ✅ MySQL database running on port 3307
- ✅ npm installed

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd naasco-backend
npm install
```

### 2. Configure Environment

The `.env` file should already be configured. If not, copy from `.env.example`:

```bash
cp .env.example .env
```

Verify these settings in `.env`:
```env
PORT=3001
DATABASE_URL="mysql://root:root@localhost:3307/naasco_db"
JWT_SECRET="my-super-secret-jwt-key"
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=naasco_db
```

### 3. Setup Database

Create the database if it doesn't exist:
```sql
CREATE DATABASE naasco_db;
```

Run migrations to create tables:
```bash
npm run db:push
```

This will create:
- `roles` table with 3 default roles (admin, manager, member)
- `users` table with foreign key to roles

### 4. Start the Server

```bash
npm run dev
```

You should see:
```
🚀 Server is running on http://localhost:3001
```

### 5. Test the API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Quick API Tests

### Register a User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@naasco.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

Save the token from the response!

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@naasco.com",
    "password": "admin123"
  }'
```

### Get Profile (requires token)

Replace `YOUR_TOKEN` with the token from login/register:

```bash
curl http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Automated Test Suite

Run the complete test suite:

```bash
node test-api.js
```

This will:
- ✅ Test health check
- ✅ Register a new user
- ✅ Test duplicate registration (should fail)
- ✅ Login with credentials
- ✅ Test wrong password (should fail)
- ✅ Get current user info
- ✅ Get user profile
- ✅ Test protected routes
- ✅ Test authentication errors

## Available Endpoints

### Public Endpoints
- `GET /` - API info
- `GET /api/health` - Health check
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Protected Endpoints (require Authorization header)
- `GET /api/auth/me` - Get current user
- `GET /api/users/profile` - Get user profile
- `GET /api/users` - Get all users (admin/manager only)
- `GET /api/users/:id` - Get user by ID (admin/manager only)

## Database Management

### View Database (GUI)

```bash
npm run db:studio
```

This opens Drizzle Studio in your browser to view and edit data.

### Generate New Migration

After changing `src/db/schema.ts`:

```bash
npm run db:generate
```

### Apply Migration

```bash
npm run db:migrate
```

### Push Schema (Development)

Quickly sync schema without migrations:

```bash
npm run db:push
```

## Common Issues

### Port Already in Use

If port 3001 is busy, change it in `.env`:
```env
PORT=3002
```

### Database Connection Failed

1. Check if MySQL is running:
   ```bash
   mysql -u root -p
   ```

2. Verify port (default MySQL is 3306, we're using 3307):
   ```bash
   mysql -u root -p -P 3307
   ```

3. Create database if missing:
   ```sql
   CREATE DATABASE naasco_db;
   ```

### TypeScript Errors

Rebuild the project:
```bash
npm run build
```

### Missing Roles

If roles table is empty, run:
```bash
npm run db:push
```

Then manually insert roles:
```sql
INSERT INTO roles (name, description) VALUES
('admin', 'Administrator with full access'),
('manager', 'Manager with elevated privileges'),
('member', 'Regular member with basic access');
```

## Next Steps

1. **Read Full Documentation**
   - [README.md](./README.md) - Complete overview
   - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
   - [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - Frontend guide

2. **Integrate with Frontend**
   - The frontend should run on `http://localhost:3000`
   - Use the provided API client examples
   - Implement authentication context

3. **Customize**
   - Add more endpoints
   - Extend user schema
   - Add more roles
   - Implement additional features

## Need Help?

- Check logs in the terminal running `npm run dev`
- Review error responses in API calls
- Test with `node test-api.js`
- Check database with `npm run db:studio`

---

**You're all set!** 🎉

The backend is ready to authenticate users for the NAASCO frontend application.

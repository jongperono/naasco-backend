# NAASCO Backend API

A robust backend API built with Hono.js, TypeScript, and MySQL using Drizzle ORM.

## Features

- ✅ **Authentication System**
  - User registration with email validation
  - Login with JWT token generation
  - Password hashing with bcrypt
  - Token-based authentication
  - Role-based access control (RBAC)

- ✅ **Role Management**
  - Three default roles: Admin, Manager, Member
  - Foreign key relationship between users and roles
  - Role-based route protection

- ✅ **Security**
  - JWT tokens with configurable expiration
  - Secure JWT secret validation (32+ character minimum)
  - Algorithm allowlisting (prevents algorithm confusion attacks)
  - Fail-fast startup validation
  - Password hashing with bcrypt
  - CORS configuration
  - Input validation with Zod
  - Protected routes with middleware

## Tech Stack

- **Framework**: Hono.js (Fast, lightweight web framework)
- **Runtime**: Node.js with TypeScript
- **Database**: MySQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Zod
- **Development**: tsx (TypeScript execution)

## Project Structure

```
naasco-backend/
├── src/
│   ├── db/
│   │   ├── index.ts              # Database connection
│   │   ├── schema.ts             # Database schema (users, roles)
│   │   └── migrations/           # SQL migrations
│   ├── middleware/
│   │   └── auth.middleware.ts    # JWT authentication & role checking
│   ├── routes/
│   │   ├── auth.routes.ts        # Auth endpoints (login, register, me)
│   │   └── users.routes.ts       # User endpoints (profile, list)
│   └── index.ts                  # Main application entry
├── .env                          # Environment variables
├── drizzle.config.ts             # Drizzle ORM configuration
├── package.json
├── tsconfig.json
├── API_DOCUMENTATION.md          # Complete API documentation
└── FRONTEND_INTEGRATION.md       # Frontend integration guide
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MySQL (running on port 3307)
- npm or yarn

### Important Security Notice ⚠️

This application implements strict JWT security requirements. Before starting:
1. Generate a secure JWT_SECRET (minimum 32 characters)
2. Never use default or example values in production

📖 **Quick Links**:
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Start here for overview
- **[JWT_SECURITY.md](./JWT_SECURITY.md)** - Complete security guide
- **[SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)** - Technical details

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   
   Copy `.env.example` to `.env` and update the values:
   ```env
   NODE_ENV=development
   PORT=3001
   
   DATABASE_URL="mysql://root:root@localhost:3307/naasco_db"
   
   # CRITICAL: Generate a secure JWT_SECRET (at least 32 characters)
   # Use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   JWT_SECRET="your-generated-64-character-secret-here"
   JWT_EXPIRES_IN="7d"
   
   BCRYPT_SALT_ROUNDS=10
   
   DB_HOST=localhost
   DB_PORT=3307
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=naasco_db
   ```
   
   **⚠️ IMPORTANT**: See [JWT_SECURITY.md](./JWT_SECURITY.md) for detailed JWT security setup instructions.

3. **Run database migrations**:
   ```bash
   npm run db:push
   ```
   
   Or if you prefer to use migrations:
   ```bash
   npm run db:migrate
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:generate` - Generate new migration files
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Database Schema

### Roles Table
```sql
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);
```

**Default Roles**:
- `admin` - Full access to all endpoints
- `manager` - Elevated privileges, can view all users
- `member` - Basic access (default for new users)

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  role_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

## API Endpoints

### Public Endpoints

#### Health Check
```
GET /api/health
```

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890" // optional
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Protected Endpoints

All protected endpoints require an `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

#### Get Current User
```
GET /api/auth/me
```

#### Get User Profile
```
GET /api/users/profile
```

#### Get All Users (Admin/Manager only)
```
GET /api/users
```

#### Get User by ID (Admin/Manager only)
```
GET /api/users/:id
```

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## Authentication Flow

1. **Registration**:
   - User submits registration form
   - Backend validates input with Zod
   - Password is hashed with bcrypt
   - User is created with default 'member' role
   - JWT token is generated and returned

2. **Login**:
   - User submits credentials
   - Backend verifies email exists
   - Password is compared with stored hash
   - JWT token is generated and returned

3. **Protected Routes**:
   - Client includes JWT token in Authorization header
   - Middleware verifies token
   - User information is attached to request context
   - Route handler processes request

4. **Role-Based Access**:
   - `requireRole()` middleware checks user's role
   - Access is granted or denied based on allowed roles

## Middleware

### `authMiddleware`
Verifies JWT token and attaches user to context.

```typescript
import { authMiddleware } from './middleware/auth.middleware';

app.get('/protected', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

### `requireRole(allowedRoles: string[])`
Checks if user has required role.

```typescript
import { authMiddleware, requireRole } from './middleware/auth.middleware';

app.get('/admin', authMiddleware, requireRole(['admin']), async (c) => {
  return c.json({ message: 'Admin only' });
});
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message here",
  "details": [] // Optional, for validation errors
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

## Security Best Practices

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use strong JWT_SECRET** - Must be at least 32 characters (see [JWT_SECURITY.md](./JWT_SECURITY.md))
3. **Generate cryptographic secrets** - Use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Use HTTPS in production** - Never send tokens over HTTP
5. **Validate all input** - Use Zod schemas for validation
6. **Hash passwords** - Never store plain text passwords
7. **Algorithm allowlisting** - JWT verification explicitly specifies HS256
8. **Fail-fast validation** - App won't start with invalid environment variables
9. **Implement rate limiting** - Prevent brute force attacks (TODO)
10. **Log security events** - Track failed login attempts (TODO)

For comprehensive JWT security documentation, see [JWT_SECURITY.md](./JWT_SECURITY.md)

## Development Tips

### Testing with cURL

**Register**:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

**Login**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get Profile**:
```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Database Management

**Open Drizzle Studio** (Database GUI):
```bash
npm run db:studio
```

**Generate new migration** (after schema changes):
```bash
npm run db:generate
```

**Apply migrations**:
```bash
npm run db:migrate
```

## Frontend Integration

For detailed frontend integration instructions, see [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)

Quick example:
```typescript
// Login
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const data = await response.json();
localStorage.setItem('token', data.data.token);

// Authenticated request
const profileResponse = await fetch('http://localhost:3001/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
});
```

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running on the correct port (3307)
- Verify credentials in `.env` file
- Check if database `naasco_db` exists

### TypeScript Errors
- Run `npm run build` to check for compilation errors
- Ensure all dependencies are installed: `npm install`

### JWT Token Issues
- Verify `JWT_SECRET` is set in `.env`
- Check token expiration settings
- Ensure Authorization header format: `Bearer <token>`

### CORS Issues
- Update CORS origins in `src/index.ts` if frontend runs on different port
- Current allowed origins: `http://localhost:3000`, `http://localhost:3001`

## TODO / Future Enhancements

- [ ] Password reset functionality
- [ ] Email verification
- [ ] Refresh token mechanism
- [ ] Rate limiting
- [ ] Logging system
- [ ] API versioning
- [ ] Pagination for user list
- [ ] User profile updates
- [ ] Role management endpoints (create, update, delete roles)
- [ ] Audit logging
- [ ] Two-factor authentication (2FA)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC

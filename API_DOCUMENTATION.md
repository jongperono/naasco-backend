# NAASCO Backend API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Auth Endpoints

### 1. Register User
Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890" // optional
}
```

**Success Response (201):**
```json
{
  "message": "Registration successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "role": "member",
      "roleId": 3,
      "isActive": true
    }
  }
}
```

**Error Responses:**
- `400`: Validation failed
- `409`: Email already registered
- `500`: Internal server error

---

### 2. Login
Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "role": "member",
      "roleId": 3,
      "isActive": true
    }
  }
}
```

**Error Responses:**
- `400`: Validation failed
- `401`: Invalid email or password
- `403`: Account is deactivated
- `500`: Internal server error

---

### 3. Get Current User
Verify token and get current user information.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "role": "member",
      "roleId": 3,
      "isActive": true
    }
  }
}
```

**Error Responses:**
- `401`: No token provided / Invalid token / Token expired
- `403`: Account is deactivated
- `404`: User not found
- `500`: Internal server error

---

## User Endpoints

### 4. Get User Profile
Get the current authenticated user's profile.

**Endpoint:** `GET /api/users/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "roleId": 3,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "role": "member"
    }
  }
}
```

**Error Responses:**
- `401`: Unauthorized (no token or invalid token)
- `404`: User not found
- `500`: Internal server error

---

### 5. Get All Users
Get a list of all users (Admin/Manager only).

**Endpoint:** `GET /api/users`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Required Role:** `admin` or `manager`

**Success Response (200):**
```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+1234567890",
        "roleId": 3,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "role": "member"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Insufficient permissions
- `500`: Internal server error

---

### 6. Create User
Create a new user (Admin/Manager only).

**Endpoint:** `POST /api/users`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Required Role:** `admin` or `manager`

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890", // optional
  "roleId": 1, // optional, defaults to member role (3)
  "isActive": true // optional, defaults to true
}
```

**Success Response (201):**
```json
{
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "newuser@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "roleId": 1,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "role": "admin"
    }
  }
}
```

**Error Responses:**
- `400`: Validation failed or invalid role ID
- `401`: Unauthorized
- `403`: Insufficient permissions
- `409`: Email already registered
- `500`: Internal server error

**Notes:**
- Password is automatically hashed with bcrypt
- If `roleId` is not provided, user will be assigned the 'member' role
- If `isActive` is not provided, defaults to `true`
- Phone number is optional

---

### 7. Get User by ID
Get a specific user by their ID (Admin/Manager only).

**Endpoint:** `GET /api/users/:id`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Required Role:** `admin` or `manager`

**URL Parameters:**
- `id` (number): The user's ID

**Success Response (200):**
```json
{
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "roleId": 3,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "role": "member"
    }
  }
}
```

**Error Responses:**
- `400`: Invalid user ID
- `401`: Unauthorized
- `403`: Insufficient permissions
- `404`: User not found
- `500`: Internal server error

---

## Roles

The system has three default roles:

1. **admin** - Full access to all endpoints
2. **manager** - Elevated privileges, can view all users
3. **member** - Basic access, default role for new users

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message here",
  "details": [] // Optional, for validation errors
}
```

---

## Testing the API

### Using cURL:

**Register:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Current User:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get Profile:**
```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using JavaScript/Fetch:

**Login:**
```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store token
    localStorage.setItem('token', data.data.token);
    return data.data.user;
  } else {
    throw new Error(data.error);
  }
};
```

**Authenticated Request:**
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3001/api/users/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  
  if (response.ok) {
    return data.data.user;
  } else {
    throw new Error(data.error);
  }
};
```

---

## Environment Variables

Required environment variables (configured in `.env`):

```env
NODE_ENV=development
PORT=3001

DATABASE_URL="mysql://root:root@localhost:3307/naasco_db"

JWT_SECRET="my-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

BCRYPT_SALT_ROUNDS=10

DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root
DB_NAME=naasco_db
```

---

## Security Notes

1. Always use HTTPS in production
2. Keep JWT_SECRET secure and never commit it to version control
3. Tokens expire based on JWT_EXPIRES_IN (default: 7 days)
4. Passwords are hashed using bcrypt with configurable salt rounds
5. CORS is configured to allow requests from localhost:3000 and localhost:3001

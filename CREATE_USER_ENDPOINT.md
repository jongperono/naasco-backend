# Create User API Endpoint

## Overview

A new POST endpoint has been added to allow admin and manager users to create new users directly through the API.

---

## Endpoint Details

**URL:** `POST /api/users`

**Authentication:** Required (JWT Bearer token)

**Authorization:** Admin or Manager role only

**Content-Type:** `application/json`

---

## Request Body

### Required Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `email` | string | Valid email format | User's email address (must be unique) |
| `password` | string | Min 6 characters | User's password (will be hashed) |
| `firstName` | string | Min 1 character | User's first name |
| `lastName` | string | Min 1 character | User's last name |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `phoneNumber` | string | `null` | User's phone number |
| `roleId` | integer | 3 (member) | Role ID (1=admin, 2=manager, 3=member) |
| `isActive` | boolean | `true` | Whether the account is active |

---

## Examples

### Example 1: Create a Basic Member

**Request:**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
  }'
```

**Response (201 Created):**
```json
{
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 5,
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "roleId": 3,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "role": "member"
    }
  }
}
```

---

### Example 2: Create an Admin User

**Request:**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "roleId": 1
  }'
```

**Response (201 Created):**
```json
{
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 6,
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "phoneNumber": null,
      "roleId": 1,
      "isActive": true,
      "createdAt": "2024-01-15T10:35:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z",
      "role": "admin"
    }
  }
}
```

---

### Example 3: Create an Inactive User

**Request:**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inactive@example.com",
    "password": "password123",
    "firstName": "Inactive",
    "lastName": "Account",
    "isActive": false
  }'
```

---

### Example 4: Create Manager User

**Request:**
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "manager123",
    "firstName": "Manager",
    "lastName": "User",
    "roleId": 2,
    "phoneNumber": "+1987654321"
  }'
```

---

## Error Responses

### 400 - Validation Error

**Invalid Email:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_string",
      "validation": "email",
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

**Password Too Short:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 6,
      "path": ["password"],
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

**Invalid Role ID:**
```json
{
  "error": "Invalid role ID"
}
```

---

### 401 - Unauthorized

**Missing Token:**
```json
{
  "error": "No token provided"
}
```

**Invalid Token:**
```json
{
  "error": "Invalid token"
}
```

---

### 403 - Forbidden

**Insufficient Permissions:**
```json
{
  "error": "Insufficient permissions"
}
```

This occurs when a user with the "member" role tries to create a user.

---

### 409 - Conflict

**Duplicate Email:**
```json
{
  "error": "Email already registered"
}
```

---

### 500 - Internal Server Error

```json
{
  "error": "Failed to create user"
}
```

---

## Role IDs

| ID | Role Name | Description |
|----|-----------|-------------|
| 1 | admin | Full system access |
| 2 | manager | Elevated privileges |
| 3 | member | Basic access (default) |

---

## Security Features

1. **Password Hashing**: Passwords are automatically hashed using bcrypt with 10 salt rounds
2. **Email Uniqueness**: Duplicate emails are prevented at the database level
3. **Role Validation**: The API validates that the provided roleId exists
4. **Authentication Required**: Only authenticated users can access this endpoint
5. **Role-Based Access**: Only admin and manager roles can create users
6. **Input Validation**: All inputs are validated using Zod schemas

---

## Testing with REST Client (.http file)

```http
### Create a new user
POST http://localhost:3001/api/users
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123",
  "firstName": "Test",
  "lastName": "User",
  "phoneNumber": "+1234567890"
}
```

---

## Frontend Integration

### TypeScript/JavaScript Example

```typescript
async function createUser(token: string, userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleId?: number;
  isActive?: boolean;
}) {
  const response = await fetch('http://localhost:3001/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create user');
  }

  return data.data.user;
}

// Usage
try {
  const newUser = await createUser(authToken, {
    email: 'newuser@example.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'User',
    phoneNumber: '+1234567890',
  });
  
  console.log('User created:', newUser);
} catch (error) {
  console.error('Error:', error.message);
}
```

---

## React Hook Example

```typescript
import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roleId?: number;
  isActive?: boolean;
}

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (data: CreateUserData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createUser(data);
      
      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data?.user;
    } catch (err) {
      setError('Failed to create user');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error };
}
```

---

## Difference from Registration

| Feature | Register Endpoint | Create User Endpoint |
|---------|------------------|---------------------|
| **URL** | `/api/auth/register` | `/api/users` |
| **Authentication** | Not required (public) | Required (JWT token) |
| **Authorization** | Anyone | Admin/Manager only |
| **Default Role** | Always "member" | Configurable via `roleId` |
| **Returns Token** | Yes | No |
| **Use Case** | Self-registration | Admin creating users |
| **Can Set Active Status** | No (always active) | Yes via `isActive` |

---

## Use Cases

1. **Admin Dashboard**: Admins can create user accounts for new employees
2. **Bulk User Creation**: Can be used to programmatically create multiple users
3. **Specific Role Assignment**: Create users with specific roles (admin, manager)
4. **Pre-configured Accounts**: Create inactive accounts that users can activate later
5. **Testing**: Create test users with specific configurations

---

## Next Steps

To use this endpoint in your application:

1. Ensure your backend is running: `npm run dev`
2. Login as an admin or manager to get a token
3. Use the token to create new users via this endpoint
4. See `api-tests.http` for complete testing examples

---

**The create user endpoint is ready to use!** 🎉

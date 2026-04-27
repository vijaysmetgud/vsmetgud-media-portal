# Media Portal - Authentication Setup Guide

## Overview
This project now includes PostgreSQL database and Redis cache for user authentication and session management.

## Features Added
- ✅ User Registration with email validation
- ✅ User Login with JWT authentication
- ✅ Redis session caching (7-day expiry)
- ✅ PostgreSQL user storage with bcrypt password hashing
- ✅ Protected routes and token verification
- ✅ Logout functionality with session cleanup
- ✅ Frontend UI for login/registration

## Prerequisites
- **PostgreSQL 12+** - for user data storage
- **Redis 6+** - for session caching
- **Node.js 14+** - for the backend server
- **npm** - for dependency management

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `pg` - PostgreSQL client
- `redis` - Redis client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation
- `dotenv` - Environment variable management
- `express` - Web framework
- `sqlite3` - Visitor tracking database

### 2. Configure Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
# PostgreSQL Configuration
POSTGRES_USER=mediauser
POSTGRES_PASSWORD=securepassword123
POSTGRES_DB=media_portal_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
PORT=8080
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

### 3. Setup PostgreSQL Database

Create PostgreSQL database and user:

```sql
-- Create user
CREATE USER mediauser WITH PASSWORD 'securepassword123';

-- Create database
CREATE DATABASE media_portal_db OWNER mediauser;

-- Grant privileges
GRANT CONNECT ON DATABASE media_portal_db TO mediauser;
GRANT CREATE ON DATABASE media_portal_db TO mediauser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mediauser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mediauser;
```

Or use this one-liner (if you have admin access):
```bash
psql -U postgres -c "CREATE USER mediauser WITH PASSWORD 'securepassword123';"
psql -U postgres -c "CREATE DATABASE media_portal_db OWNER mediauser;"
```

### 4. Setup Redis

Start Redis server:

**Windows:**
```bash
redis-server
```

**Linux/Mac:**
```bash
redis-server
```

Or via Docker:
```bash
docker run -d -p 6379:6379 redis:latest
```

### 5. Start the Application

```bash
npm start
```

The server will automatically:
- Create the `users` table in PostgreSQL
- Connect to Redis
- Start listening on http://localhost:8080

## API Endpoints

### Authentication Endpoints

#### 1. Register User
**POST** `/api/register`
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "confirmPassword": "SecurePassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### 2. Login User
**POST** `/api/login`
```json
{
  "username": "john_doe",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### 3. Get Current User (Protected)
**GET** `/api/user`
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2024-04-27T10:30:00Z",
    "last_login": "2024-04-27T10:45:00Z"
  }
}
```

#### 4. Logout User (Protected)
**POST** `/api/logout`
**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Database Schema

### PostgreSQL - Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

### SQLite - Visitors Table (Existing)
Tracks visitor hits and analytics.

### Redis - Session Cache
- Key: `user_session:{userId}`
- Value: JSON object with user details
- TTL: 7 days

## Frontend Usage

### Login Screen
- Username and password fields for existing users
- "Create new account" button to switch to registration
- Dynamic form validation

### Registration
- Username, email, password, and confirm password
- Client-side validation before submission
- Automatic login after successful registration

### After Login
- User profile displayed in the auth bar
- "Sign Out" button available
- JWT token stored in localStorage
- Token sent with all authenticated requests

## Error Handling

### Common Errors

**"Invalid username or password"**
- Check credentials are correct
- Ensure user account exists

**"Username or email already exists"**
- Username or email is taken
- Use a different username/email

**"Passwords do not match"**
- Confirm passwords must be identical

**"Password must be at least 6 characters"**
- Use a stronger password

**"Invalid email format"**
- Email must contain "@" symbol

## Security Considerations

1. **JWT Secret** - Change `JWT_SECRET` in `.env` for production
2. **Password Hashing** - Passwords are hashed with bcrypt (10 rounds)
3. **HTTPS** - Use HTTPS in production to protect tokens
4. **Token Expiry** - Tokens expire after 7 days
5. **Session Cache** - Redis stores session data with TTL
6. **CORS** - Configure CORS_ORIGIN in `.env` for production

## Troubleshooting

### PostgreSQL Connection Refused
- Check PostgreSQL is running: `psql -U mediauser -d media_portal_db`
- Verify credentials in `.env` match your setup
- Check host and port settings

### Redis Connection Failed
- Ensure Redis server is running
- Check Redis host and port in `.env`
- Try: `redis-cli ping` (should return PONG)

### JWT Token Invalid
- Token may have expired (7 days)
- Try logging in again
- Check token format in Authorization header

### Users Table Already Exists
- This is normal on subsequent runs
- PostgreSQL checks `IF NOT EXISTS` before creating

## Development vs Production

### Development (.env.example)
```
NODE_ENV=development
JWT_SECRET=change_me_in_production
```

### Production
```
NODE_ENV=production
JWT_SECRET=generate_random_secure_key_here
POSTGRES_PASSWORD=strong_random_password
REDIS_PASSWORD=strong_random_password
```

## Docker Deployment

See `Dockerfile` and `docker-compose.yml` for containerized deployment.

## Support

For issues or questions, check:
1. Environment variables in `.env`
2. Database and Redis connectivity
3. Browser console for client-side errors
4. Server logs for backend errors

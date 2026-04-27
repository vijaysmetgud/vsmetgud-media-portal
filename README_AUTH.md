# VSMETGUD Media Portal - User Authentication System

## 📋 Overview

This is an enterprise media portal application with a complete user authentication system featuring:

- **PostgreSQL Database** - Secure user credential storage
- **Redis Cache** - Session management and performance optimization  
- **JWT Authentication** - Stateless token-based authentication
- **User Registration & Login** - Full auth flow with validation
- **Bcrypt Password Hashing** - Industry-standard security
- **Visitor Tracking** - Analytics and visitor metrics

## 🎯 Key Features

### Authentication
- ✅ User Registration with email validation
- ✅ Secure Password Hashing (bcrypt)
- ✅ JWT Token Generation & Verification
- ✅ Password Confirmation Validation
- ✅ Automatic Session Storage in Redis
- ✅ Token-based Protected Routes
- ✅ Logout with Session Cleanup
- ✅ Toggle between Login/Register UI

### Database
- ✅ PostgreSQL for persistent user storage
- ✅ Redis for session caching (7-day TTL)
- ✅ SQLite for visitor analytics
- ✅ Automatic table creation on startup
- ✅ Secure credentials storage

### Frontend
- ✅ Modern, responsive authentication UI
- ✅ Real-time form validation
- ✅ Error handling and messaging
- ✅ Token persistence in localStorage
- ✅ User profile display
- ✅ Seamless login/register toggle

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ ([Download](https://nodejs.org))
- PostgreSQL 12+ ([Download](https://www.postgresql.org))
- Redis 6+ ([Download](https://redis.io) or use [Docker](https://www.docker.com))
- npm (comes with Node.js)

### Installation

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment
Copy `.env.example` to `.env` and update with your settings:
```bash
cp .env.example .env
```

Edit `.env`:
```env
POSTGRES_USER=mediauser
POSTGRES_PASSWORD=securepassword123
POSTGRES_DB=media_portal_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_super_secret_key_here
PORT=8080
```

#### 3. Setup PostgreSQL
Create database and user:
```bash
# Using psql
psql -U postgres

# In psql shell
CREATE USER mediauser WITH PASSWORD 'securepassword123';
CREATE DATABASE media_portal_db OWNER mediauser;
GRANT CONNECT ON DATABASE media_portal_db TO mediauser;
GRANT CREATE ON DATABASE media_portal_db TO mediauser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mediauser;
```

Or use one-liner:
```bash
psql -U postgres -c "CREATE USER mediauser WITH PASSWORD 'securepassword123';" && \
psql -U postgres -c "CREATE DATABASE media_portal_db OWNER mediauser;"
```

#### 4. Start Redis
**Windows:**
```bash
redis-server
```

**Linux/Mac:**
```bash
redis-server
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

#### 5. Start the Application
```bash
npm start
```

Server will run on: `http://localhost:8080`

## 📖 Usage

### First Time Users

1. **Open the Application**
   - Navigate to `http://localhost:8080`
   - You'll see the login screen

2. **Create an Account**
   - Click "Create new account"
   - Fill in Username, Email, Password, Confirm Password
   - Click "Register"
   - You'll be automatically logged in

3. **Access Media Portal**
   - Browse available files
   - Use categories to filter content
   - Search for files using the AI chat interface

### Existing Users

1. **Login**
   - Enter your username and password
   - Click "Sign in with password"
   - Access your portal

2. **Logout**
   - Click "Sign Out" button in top-right
   - Session will be cleared from Redis
   - Token will be removed from localStorage

## 🔌 API Endpoints

### Authentication Endpoints

#### Register User
```
POST /api/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}

Response 201:
{
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### Login User
```
POST /api/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123"
}

Response 200:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### Get Current User (Protected)
```
GET /api/user
Authorization: Bearer eyJhbGc...

Response 200:
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

#### Logout User (Protected)
```
POST /api/logout
Authorization: Bearer eyJhbGc...

Response 200:
{
  "message": "Logged out successfully"
}
```

### Analytics Endpoints

#### Get Visitor Statistics
```
GET /api/visitor-stats

Response 200:
{
  "success": true,
  "totalHits": 1024,
  "uniqueIps": 256,
  "latest": [
    {
      "timestamp": "2024-04-27T10:45:00Z",
      "username": "john_doe",
      "url": "/",
      "platform": "Windows",
      "language": "en-US"
    }
  ]
}
```

#### Get All Visitors
```
GET /api/visitors?limit=50

Response 200:
{
  "success": true,
  "visitors": [...]
}
```

## 🗄️ Database Schema

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

### Redis - Session Cache
- **Key Format**: `user_session:{userId}`
- **TTL**: 7 days (604,800 seconds)
- **Value Example**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "loginTime": "2024-04-27T10:45:00Z"
}
```

### SQLite - Visitors Analytics
```sql
CREATE TABLE visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  username TEXT,
  email TEXT,
  authMethod TEXT,
  url TEXT,
  userAgent TEXT,
  platform TEXT,
  language TEXT,
  referrer TEXT,
  timestamp TEXT
);
```

## 🔐 Security Features

### Password Security
- Bcrypt hashing with 10 salt rounds
- Minimum 6 characters required
- Confirmation password validation
- Passwords never stored in plain text

### Token Security
- JWT tokens with 7-day expiry
- HS256 signing algorithm
- Custom JWT_SECRET required
- Tokens stored only in localStorage
- Token sent via Authorization header
- Token removed on logout

### Session Security
- Redis session caching with TTL
- Session removed on logout
- Automatic session cleanup after expiry
- No server-side session storage needed

### Input Validation
- Username length validation
- Email format validation
- Password strength requirements
- Duplicate username/email check
- Password confirmation matching

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| POSTGRES_USER | mediauser | PostgreSQL user |
| POSTGRES_PASSWORD | securepassword | PostgreSQL password |
| POSTGRES_HOST | localhost | PostgreSQL host |
| POSTGRES_PORT | 5432 | PostgreSQL port |
| POSTGRES_DB | media_portal_db | Database name |
| REDIS_HOST | localhost | Redis host |
| REDIS_PORT | 6379 | Redis port |
| REDIS_PASSWORD | (empty) | Redis password |
| PORT | 8080 | Server port |
| NODE_ENV | development | Environment |
| JWT_SECRET | (required) | JWT signing key |
| JWT_EXPIRE | 7d | Token expiry |

## 🐛 Troubleshooting

### Connection Errors

**PostgreSQL Connection Refused**
```bash
# Test connection
psql -U mediauser -d media_portal_db -h localhost

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

**Redis Connection Failed**
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check if Redis is running
redis-cli INFO
```

### Authentication Issues

**"Invalid username or password"**
- Verify credentials are correct
- Check user exists: `SELECT * FROM users WHERE username='john_doe';`
- Reset password through admin if needed

**"Username or email already exists"**
- Use different username/email
- Or login with existing credentials

**"Passwords do not match"**
- Ensure both password fields are identical

**Token Expired**
- Login again to get new token
- Tokens expire after 7 days by default

## 📦 Project Structure

```
vsmetgud-media-portal/
├── app/
│   ├── index.html          # Main frontend
│   ├── css/
│   │   └── style.css       # Styles
│   └── js/
│       ├── app.js          # File browser logic
│       └── auth.js         # NEW: Authentication logic
├── server.js               # UPDATED: Backend with auth
├── package.json            # UPDATED: Dependencies
├── .env.example            # NEW: Environment template
├── AUTHENTICATION_SETUP.md # NEW: Setup guide
└── README.md               # This file
```

## 🚀 Deployment

### Using Docker

1. **Build Image**
```bash
docker build -t media-portal .
```

2. **Run Container**
```bash
docker run -p 8080:8080 \
  -e POSTGRES_HOST=db \
  -e REDIS_HOST=cache \
  --link postgres:db \
  --link redis:cache \
  media-portal
```

### Using Docker Compose
```bash
docker-compose up -d
```

See `docker-compose.yml` for full configuration.

## 📝 License

Proprietary - VSMETGUD

## 👥 Support

For issues and questions:
1. Check AUTHENTICATION_SETUP.md for detailed setup
2. Review server logs for errors
3. Check browser console for client-side issues
4. Verify database and Redis connectivity

## 🔄 Recent Updates

### v1.1.0 (Current)
- ✅ Added PostgreSQL integration
- ✅ Added Redis session caching
- ✅ Added JWT authentication
- ✅ Implemented user registration
- ✅ Implemented user login/logout
- ✅ Added password hashing
- ✅ Added token-based protected routes
- ✅ Updated frontend authentication UI

### v1.0.0
- ✅ Media file browser
- ✅ Visitor tracking
- ✅ Analytics dashboard
- ✅ File search and categorization

---

**Last Updated**: April 27, 2024
**Version**: 1.1.0

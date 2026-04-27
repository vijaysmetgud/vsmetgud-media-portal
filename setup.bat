@echo off
REM Media Portal - Windows Setup Script

echo.
echo ======================================
echo VSMETGUD Media Portal - Setup Script
echo ======================================
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Please install Node.js 14+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Check npm
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% found
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully
echo.

REM Create .env file if it doesn't exist
echo Checking environment configuration...
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo [OK] .env file created
    echo [WARNING] Please update .env with your database credentials
) else (
    echo [OK] .env file already exists
)
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
where psql >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL not found. 
    echo Please install PostgreSQL 12+ from https://www.postgresql.org
) else (
    for /f "tokens=*" %%i in ('psql --version') do set PG_VERSION=%%i
    echo [OK] !PG_VERSION! found
)
echo.

REM Check Redis
echo Checking Redis...
where redis-cli >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Redis not found.
    echo Please install Redis from https://redis.io/download or use Docker
) else (
    for /f "tokens=*" %%i in ('redis-cli --version') do set REDIS_VERSION=%%i
    echo [OK] !REDIS_VERSION! found
)
echo.

echo ======================================
echo [OK] Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Update .env with your database credentials
echo 2. Start PostgreSQL and Redis services
echo 3. Create PostgreSQL database and user:
echo    psql -U postgres -c "CREATE USER mediauser WITH PASSWORD 'securepassword123';"
echo    psql -U postgres -c "CREATE DATABASE media_portal_db OWNER mediauser;"
echo 4. Start the server: npm start
echo 5. Open http://localhost:8080 in your browser
echo.
echo For detailed setup instructions, see AUTHENTICATION_SETUP.md
echo.
pause

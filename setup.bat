@echo off
setlocal enabledelayedexpansion

REM ======================================
REM Media Portal - Windows Setup Script
REM ======================================

echo.
echo ======================================
echo VSMETGUD Media Portal - Setup Script
echo ======================================
echo.

REM ================= Node.js =================
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Install from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js !NODE_VERSION! found
echo.

REM ================= npm =================
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm !NPM_VERSION! found
echo.

REM ================= Install =================
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully
echo.

REM ================= ENV =================
echo Checking environment configuration...

if not exist .env (
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env >nul
        echo [OK] .env created
        echo [WARNING] Update DB and JWT_SECRET in .env
    ) else (
        echo [ERROR] .env.example not found!
    )
) else (
    echo [OK] .env already exists
)
echo.

REM ================= PostgreSQL =================
echo Checking PostgreSQL...

where psql >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL CLI not found
) else (
    for /f "tokens=*" %%i in ('psql --version') do set PG_VERSION=%%i
    echo [OK] !PG_VERSION! found
)
echo.

REM ================= Redis =================
echo Checking Redis...

where redis-cli >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Redis CLI not found
) else (
    for /f "tokens=*" %%i in ('redis-cli --version') do set REDIS_VERSION=%%i
    echo [OK] !REDIS_VERSION! found
)
echo.

REM ================= Summary =================
echo ======================================
echo [OK] Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Update .env (DB_HOST=postgres-service, REDIS_HOST=redis-service)
echo 2. Start PostgreSQL and Redis
echo 3. Create DB:
echo    psql -U postgres -c "CREATE DATABASE media_portal;"
echo 4. Run: npm start
echo 5. Open: http://localhost:8080
echo.
pause
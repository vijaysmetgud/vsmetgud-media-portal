#!/bin/bash
# Media Portal - Setup Script

echo "======================================"
echo "VSMETGUD Media Portal - Setup Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 14+ from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check npm
echo -e "${YELLOW}Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
echo ""
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please update .env with your database credentials${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Check PostgreSQL
echo ""
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    echo -e "${GREEN}✓ $PG_VERSION found${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found. Please install PostgreSQL 12+ from https://www.postgresql.org${NC}"
fi

# Check Redis
echo ""
echo -e "${YELLOW}Checking Redis...${NC}"
if command -v redis-cli &> /dev/null; then
    REDIS_VERSION=$(redis-cli --version)
    echo -e "${GREEN}✓ $REDIS_VERSION found${NC}"
else
    echo -e "${YELLOW}⚠ Redis not found. Please install Redis from https://redis.io/download${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update .env with your database credentials"
echo "2. Start PostgreSQL and Redis services"
echo "3. Create PostgreSQL database and user:"
echo "   psql -U postgres -c \"CREATE USER mediauser WITH PASSWORD 'securepassword123';\""
echo "   psql -U postgres -c \"CREATE DATABASE media_portal_db OWNER mediauser;\""
echo "4. Start the server: npm start"
echo "5. Open http://localhost:8080 in your browser"
echo ""
echo "For detailed setup instructions, see AUTHENTICATION_SETUP.md"
echo ""

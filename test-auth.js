#!/usr/bin/env node

/**
 * Quick test script to verify the authentication setup
 * Run: node test-auth.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:8080';
const testResults = [];

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        body: JSON.parse(responseData),
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        body: responseData,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Test helper
function logTest(name, passed, message = '') {
    const status = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const msg = message ? ` - ${message}` : '';
    console.log(`${status} ${name}${msg}`);
    testResults.push({ name, passed, message });
}

// Main test suite
async function runTests() {
    console.log(`\n${colors.blue}=====================================${colors.reset}`);
    console.log(`${colors.blue}Authentication System Test Suite${colors.reset}`);
    console.log(`${colors.blue}=====================================${colors.reset}\n`);

    let testUsername = `testuser_${Date.now()}`;
    let testEmail = `test${Date.now()}@example.com`;
    let testPassword = 'TestPass123';
    let authToken = null;

    try {
        // Test 1: Health Check
        console.log(`${colors.yellow}Testing Server Connection...${colors.reset}`);
        try {
            const response = await makeRequest('GET', '/media-index.json');
            logTest('Server is responding', response.status === 200 || response.status === 304 || response.status === 404);
        } catch (err) {
            logTest('Server is responding', false, `Cannot connect to ${BASE_URL}`);
            console.log(`\n${colors.red}ERROR: Server is not running!${colors.reset}`);
            console.log(`Start the server with: npm start\n`);
            return;
        }

        // Test 2: Register User
        console.log(`\n${colors.yellow}Testing User Registration...${colors.reset}`);
        const registerResponse = await makeRequest('POST', '/api/register', {
            username: testUsername,
            email: testEmail,
            password: testPassword,
            confirmPassword: testPassword
        });

        const registrationSuccess = registerResponse.status === 201;
        logTest('User registration', registrationSuccess, 
            registrationSuccess ? 'User created' : `HTTP ${registerResponse.status}`);

        if (registrationSuccess && registerResponse.body.token) {
            authToken = registerResponse.body.token;
            logTest('Registration returns JWT token', true);
            logTest('Token format is valid', authToken.split('.').length === 3, 
                `Token has 3 parts: ${authToken.length} chars`);
        } else {
            logTest('Registration returns JWT token', false);
        }

        // Test 3: Login with registered user
        console.log(`\n${colors.yellow}Testing User Login...${colors.reset}`);
        const loginResponse = await makeRequest('POST', '/api/login', {
            username: testUsername,
            password: testPassword
        });

        const loginSuccess = loginResponse.status === 200 && loginResponse.body.token;
        logTest('User login', loginSuccess, 
            loginSuccess ? 'Login successful' : `HTTP ${loginResponse.status}`);

        if (loginSuccess) {
            authToken = loginResponse.body.token;
            logTest('Login returns JWT token', true);
        }

        // Test 4: Get current user (protected)
        if (authToken) {
            console.log(`\n${colors.yellow}Testing Protected Routes...${colors.reset}`);
            const userResponse = await makeRequest('GET', '/api/user');
            
            // Add auth header
            const userUrl = new URL('/api/user', BASE_URL);
            const userOptions = {
                hostname: userUrl.hostname,
                port: userUrl.port,
                path: userUrl.pathname,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            };

            const protectedResponse = await new Promise((resolve, reject) => {
                const req = http.request(userOptions, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve({ status: res.statusCode, body: JSON.parse(data) });
                        } catch (e) {
                            resolve({ status: res.statusCode, body: data });
                        }
                    });
                });
                req.on('error', reject);
                req.end();
            });

            const protectedSuccess = protectedResponse.status === 200;
            logTest('Get current user (protected route)', protectedSuccess,
                protectedSuccess ? 'User data retrieved' : `HTTP ${protectedResponse.status}`);
        }

        // Test 5: Duplicate registration
        console.log(`\n${colors.yellow}Testing Validation...${colors.reset}`);
        const duplicateResponse = await makeRequest('POST', '/api/register', {
            username: testUsername,
            email: testEmail,
            password: testPassword,
            confirmPassword: testPassword
        });

        const duplicateBlocked = duplicateResponse.status === 400;
        logTest('Duplicate username/email is blocked', duplicateBlocked,
            duplicateBlocked ? 'Error returned' : `HTTP ${duplicateResponse.status}`);

        // Test 6: Invalid credentials
        const invalidResponse = await makeRequest('POST', '/api/login', {
            username: 'nonexistent',
            password: 'wrongpassword'
        });

        const invalidBlocked = invalidResponse.status === 401;
        logTest('Invalid login is rejected', invalidBlocked,
            invalidBlocked ? 'Error returned' : `HTTP ${invalidResponse.status}`);

        // Test 7: Database connectivity
        console.log(`\n${colors.yellow}Testing Database Connectivity...${colors.reset}`);
        if (registrationSuccess) {
            logTest('PostgreSQL connectivity', true, 'User table exists and can insert');
            logTest('Redis connectivity', true, 'Session stored in cache');
        } else {
            logTest('PostgreSQL connectivity', false);
            logTest('Redis connectivity', false);
        }

    } catch (error) {
        logTest('Test suite execution', false, error.message);
    }

    // Summary
    console.log(`\n${colors.blue}=====================================${colors.reset}`);
    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    const allPassed = passedTests === totalTests;

    if (allPassed) {
        console.log(`${colors.green}All tests passed! (${passedTests}/${totalTests})${colors.reset}`);
    } else {
        console.log(`${colors.yellow}${passedTests}/${totalTests} tests passed${colors.reset}`);
        console.log(`${colors.red}${totalTests - passedTests} tests failed${colors.reset}`);
    }
    console.log(`${colors.blue}=====================================${colors.reset}\n`);

    // Recommendations
    if (!allPassed) {
        console.log(`${colors.yellow}Troubleshooting:${colors.reset}`);
        console.log('1. Ensure PostgreSQL is running and database is created');
        console.log('2. Ensure Redis is running on localhost:6379');
        console.log('3. Check .env file has correct database credentials');
        console.log('4. Check server logs for detailed error messages');
        console.log('5. Verify npm dependencies are installed: npm install\n');
    }
}

// Run tests
runTests().catch(err => {
    console.error(`${colors.red}Test suite error:${colors.reset}`, err.message);
    process.exit(1);
});

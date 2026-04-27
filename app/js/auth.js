// ==================== AUTHENTICATION MODULE ====================

let currentUser = null;
let authToken = null;
let isRegisterMode = false;

// Update user profile display
function updateUserProfile(user) {
    const name = user.username || 'Signed-in User';
    const email = user.email || 'No email available';
    const picture = 'https://www.gravatar.com/avatar/?d=mp&f=y';

    document.getElementById('userName').innerText = name;
    document.getElementById('userEmail').innerText = email;
    document.getElementById('userAvatar').src = picture;
}

// Toggle between login and registration modes
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const emailInput = document.getElementById('emailInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authDescription = document.getElementById('authDescription');
    const toggleBtn = document.querySelector('button[onclick="toggleAuthMode()"]');

    if (isRegisterMode) {
        emailInput.style.display = 'block';
        confirmPasswordInput.style.display = 'block';
        authTitle.innerText = 'Create Account';
        authSubmitBtn.innerText = 'Register';
        authDescription.innerText = 'Create a new account to access the portal.';
        toggleBtn.innerText = 'Already have an account?';
    } else {
        emailInput.style.display = 'none';
        confirmPasswordInput.style.display = 'none';
        authTitle.innerText = 'Sign in';
        authSubmitBtn.innerText = 'Sign in with password';
        authDescription.innerText = 'Use a registered username/password to access the portal.';
        toggleBtn.innerText = 'Create new account';
    }
}

// 🔥 FIX: helper for authenticated fetch
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// Backend login
async function loginUser(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            document.getElementById('loginError').innerText = error.error || 'Login failed';
            return;
        }

        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('portalUser', JSON.stringify(currentUser));

        document.getElementById('loginError').innerText = '';
        updateUserProfile(currentUser);
        showMainContent();

        if (typeof loadCategory === "function") { // 🔥 FIX
            loadCategory("");
        }

    } catch (err) {
        console.error('Login error:', err);
        document.getElementById('loginError').innerText = 'Network error. Please try again.';
    }
}

// Backend registration
async function registerUser(username, email, password, confirmPassword) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, confirmPassword })
        });

        if (!response.ok) {
            const error = await response.json();
            document.getElementById('loginError').innerText = error.error || 'Registration failed';
            return;
        }

        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('portalUser', JSON.stringify(currentUser));

        document.getElementById('loginError').innerText = '';
        updateUserProfile(currentUser);
        showMainContent();

        if (typeof loadCategory === "function") { // 🔥 FIX
            loadCategory("");
        }

    } catch (err) {
        console.error('Registration error:', err);
        document.getElementById('loginError').innerText = 'Network error. Please try again.';
    }
}

// Handle auth form submission
function handleAuthForm(event) {
    event.preventDefault();

    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const error = document.getElementById('loginError');

    if (!username || !password) {
        error.innerText = 'Please fill in all fields';
        return;
    }

    if (isRegisterMode) {
        const email = document.getElementById('emailInput').value.trim();
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (!email.includes('@')) { // 🔥 FIX
            error.innerText = 'Please enter a valid email';
            return;
        }

        if (password !== confirmPassword) {
            error.innerText = 'Passwords do not match';
            return;
        }

        if (password.length < 6) { // 🔥 FIX
            error.innerText = 'Password must be at least 6 characters';
            return;
        }

        registerUser(username, email, password, confirmPassword);
    } else {
        loginUser(username, password);
    }
}

// Show main content
function showMainContent() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('authBar').classList.remove('hidden');
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('authBar').classList.add('hidden');
}

// Logout user
async function signOutUser() {
    try {
        if (authToken) {
            await fetch('/api/logout', {
                method: 'POST',
                headers: getAuthHeaders() // 🔥 FIX
            });
        }
    } catch (err) {
        console.warn('Logout request failed:', err);
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('portalUser');

    authToken = null;
    currentUser = null;
    isRegisterMode = false;

    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('emailInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
    document.getElementById('loginError').innerText = '';

    showLoginScreen();
}

// Initialize authentication
function initAuth() {
    const passwordForm = document.getElementById('passwordLoginForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handleAuthForm);
    }

    if (typeof recordVisitorHit === "function") { // 🔥 FIX
        recordVisitorHit();
    }

    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('portalUser');

    if (storedToken && storedUser) {
        try {
            authToken = storedToken;
            currentUser = JSON.parse(storedUser);

            updateUserProfile(currentUser);
            showMainContent();

            if (typeof loadCategory === "function") { // 🔥 FIX
                loadCategory("");
            }

        } catch (error) {
            console.warn('Unable to restore stored auth', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('portalUser');
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", initAuth);
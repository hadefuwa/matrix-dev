// Authentication System for Smart Factory Teachers Portal

const AUTH_CONFIG = {
    username: 'Matrix',
    password: 'Matrix123',
    sessionKey: 'smartFactoryAuth'
};

// Check if user is authenticated on page load
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem(AUTH_CONFIG.sessionKey);
    
    if (isAuthenticated === 'true') {
        showMainContent();
    } else {
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    
    // Focus on username field
    setTimeout(() => {
        document.getElementById('username').focus();
    }, 100);
}

// Show main content
function showMainContent() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    
    // Trigger tile animations
    if (typeof initializeTileAnimations === 'function') {
        initializeTileAnimations();
    }
}

// Handle login
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');
    
    // Clear previous error
    errorMsg.style.display = 'none';
    
    // Disable button and show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading"></span> Authenticating...';
    
    // Simulate authentication delay for better UX
    setTimeout(() => {
        if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
            // Successful login
            sessionStorage.setItem(AUTH_CONFIG.sessionKey, 'true');
            
            // Success animation
            loginBtn.innerHTML = '✓ Access Granted';
            loginBtn.style.background = 'linear-gradient(135deg, #27ae60 0%, #229954 100%)';
            
            setTimeout(() => {
                showMainContent();
            }, 500);
            
        } else {
            // Failed login
            errorMsg.textContent = 'Invalid username or password';
            errorMsg.style.display = 'block';
            
            // Shake animation
            const form = document.querySelector('.login-form');
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
            
            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Sign In';
            
            // Clear password field
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    }, 800);
}

// Handle logout
function handleLogout() {
    sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
    
    // Clear form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('errorMessage').style.display = 'none';
    
    showLoginScreen();
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + L to logout (when logged in)
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        const mainContent = document.getElementById('mainContent');
        if (mainContent.style.display === 'block') {
            event.preventDefault();
            handleLogout();
        }
    }
});

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Add form submit handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

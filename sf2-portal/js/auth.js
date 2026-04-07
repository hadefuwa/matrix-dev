const AUTH_CONFIG = {
    username: "Matrix",
    password: "Matrix123",
    sessionKey: "sf2PortalAuth"
};

function checkAuth() {
    const isAuthenticated = sessionStorage.getItem(AUTH_CONFIG.sessionKey);

    if (isAuthenticated === "true") {
        showMainContent();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("mainContent").style.display = "none";

    setTimeout(function() {
        const usernameField = document.getElementById("username");
        if (usernameField) {
            usernameField.focus();
        }
    }, 80);
}

function showMainContent() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
}

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("errorMessage");
    const loginBtn = document.getElementById("loginBtn");

    errorMsg.style.display = "none";
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading"></span> Signing in...';

    setTimeout(function() {
        if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
            sessionStorage.setItem(AUTH_CONFIG.sessionKey, "true");
            loginBtn.textContent = "Access granted";
            loginBtn.style.background = "var(--success)";
            loginBtn.style.color = "#07141c";

            setTimeout(function() {
                showMainContent();
            }, 250);
        } else {
            errorMsg.textContent = "Invalid username or password";
            errorMsg.style.display = "block";

            const form = document.querySelector(".login-form");
            form.classList.add("shake");
            setTimeout(function() {
                form.classList.remove("shake");
            }, 350);

            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
            loginBtn.style.background = "";
            loginBtn.style.color = "";

            document.getElementById("password").value = "";
            document.getElementById("password").focus();
        }
    }, 450);
}

function handleLogout() {
    sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("errorMessage").style.display = "none";

    const loginBtn = document.getElementById("loginBtn");
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In";
    loginBtn.style.background = "";
    loginBtn.style.color = "";

    showLoginScreen();
}

document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        const mainContent = document.getElementById("mainContent");
        if (mainContent && mainContent.style.display === "block") {
            event.preventDefault();
            handleLogout();
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    checkAuth();

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
});

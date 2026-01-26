// Authentication JavaScript - Handles Login & Register

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// ==================== Utility Functions ====================

function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }
}

function hideError() {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.classList.remove('show');
  }
}

function setLoading(button, loading) {
  const btnText = button.querySelector('.btn-text');
  const btnLoading = button.querySelector('.btn-loading');

  if (loading) {
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    button.disabled = true;
  } else {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    button.disabled = false;
  }
}

async function checkServerStatus() {
  const statusEl = document.getElementById('server-status');
  const statusText = statusEl.querySelector('.status-text');

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      statusEl.classList.remove('offline');
      statusEl.classList.add('online');
      statusText.textContent = 'Server connected';
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    statusEl.classList.remove('online');
    statusEl.classList.add('offline');
    statusText.textContent = 'Server offline';
  }
}

// Setup password visibility toggles
function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      const eyeIcon = button.querySelector('.eye-icon');
      const eyeOffIcon = button.querySelector('.eye-off-icon');

      if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.style.display = 'none';
        eyeOffIcon.style.display = 'block';
      } else {
        input.type = 'password';
        eyeIcon.style.display = 'block';
        eyeOffIcon.style.display = 'none';
      }
    });
  });
}

// Save auth tokens
async function saveAuthTokens(token, refreshToken, user, clearJobs = false) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = {
        authToken: token,
        refreshToken: refreshToken,
        currentUser: user,
        isAuthenticated: true
      };

      // Only clear jobs if explicitly requested (e.g., on registration)
      if (clearJobs) {
        data.trackedJobs = [];
      }

      await chrome.storage.local.set(data);
    } else {
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');

      // Only clear jobs if explicitly requested (e.g., on registration)
      if (clearJobs) {
        localStorage.removeItem('trackedJobs');
      }
    }
    console.log('[Auth] Tokens saved successfully' + (clearJobs ? ', cleared old job data' : ''));
  } catch (error) {
    console.error('[Auth] Error saving tokens:', error);
  }
}

// Redirect after successful auth
function redirectAfterAuth() {
  // Check if there's a return URL
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('returnUrl');

  if (returnUrl) {
    window.location.href = decodeURIComponent(returnUrl);
  } else {
    // Default to dashboard
    window.location.href = '../tracking-dashboard/dashboard.html';
  }
}

// Check if already authenticated
async function checkExistingAuth() {
  try {
    let token = null;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['authToken']);
      token = result.authToken;
    } else {
      token = localStorage.getItem('authToken');
    }

    if (token) {
      // Verify token is still valid
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Already authenticated, redirect
        redirectAfterAuth();
        return true;
      }
    }
  } catch (error) {
    console.log('[Auth] No existing valid session');
  }
  return false;
}

// ==================== Login Page ====================

async function initLoginPage() {
  // Check server status
  checkServerStatus();
  setInterval(checkServerStatus, 30000);

  // Setup password toggles
  setupPasswordToggles();

  // Check existing auth
  await checkExistingAuth();

  // Setup form submission
  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  hideError();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember')?.checked || false;
  const button = document.getElementById('login-btn');

  // Validation
  if (!email || !password) {
    showError('Please fill in all fields');
    return;
  }

  setLoading(button, true);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Save tokens
    await saveAuthTokens(data.data.token, data.data.refreshToken, data.data.user);

    console.log('[Auth] Login successful');

    // Redirect
    redirectAfterAuth();

  } catch (error) {
    console.error('[Auth] Login error:', error);
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    setLoading(button, false);
  }
}

// ==================== Register Page ====================

async function initRegisterPage() {
  // Check server status
  checkServerStatus();
  setInterval(checkServerStatus, 30000);

  // Setup password toggles
  setupPasswordToggles();

  // Check existing auth
  await checkExistingAuth();

  // Setup password requirements validation
  setupPasswordValidation();

  // Setup form submission
  const form = document.getElementById('register-form');
  form.addEventListener('submit', handleRegister);
}

function setupPasswordValidation() {
  const passwordInput = document.getElementById('password');
  const lengthReq = document.querySelector('[data-requirement="length"]');
  const numberReq = document.querySelector('[data-requirement="number"]');

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      const value = passwordInput.value;

      // Check length
      if (value.length >= 8) {
        lengthReq.classList.add('met');
      } else {
        lengthReq.classList.remove('met');
      }

      // Check number
      if (/\d/.test(value)) {
        numberReq.classList.add('met');
      } else {
        numberReq.classList.remove('met');
      }
    });
  }
}

async function handleRegister(e) {
  e.preventDefault();
  hideError();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const button = document.getElementById('register-btn');

  // Validation
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    showError('Please fill in all fields');
    return;
  }

  if (password.length < 8) {
    showError('Password must be at least 8 characters');
    return;
  }

  if (!/\d/.test(password)) {
    showError('Password must contain at least one number');
    return;
  }

  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }

  setLoading(button, true);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, firstName, lastName })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Save tokens
    await saveAuthTokens(data.data.token, data.data.refreshToken, data.data.user);

    console.log('[Auth] Registration successful');

    // Redirect to dashboard after registration
    redirectAfterAuth();

  } catch (error) {
    console.error('[Auth] Registration error:', error);
    showError(error.message || 'Registration failed. Please try again.');
  } finally {
    setLoading(button, false);
  }
}

// Auto-initialize based on page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form')) {
    initLoginPage();
  } else if (document.getElementById('register-form')) {
    initRegisterPage();
  }
});

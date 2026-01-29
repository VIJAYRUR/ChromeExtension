// API Configuration
// Change this to your deployed Railway URL after deployment

const CONFIG = {
  // Development (local backend)
  development: {
    API_URL: 'http://localhost:3000/api',
    ENV: 'development'
  },
  
  // Production (Render hosted backend)
  production: {
    API_URL: 'https://job-tracker-api-j7ef.onrender.com/api',
    ENV: 'production'
  }
};

// Auto-detect environment or set manually
const CURRENT_ENV = 'development'; // Change to 'development' for local testing

// Export the active configuration
const API_CONFIG = CONFIG[CURRENT_ENV];

// Make it available globally
if (typeof window !== 'undefined') {
  window.API_CONFIG = API_CONFIG;
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}


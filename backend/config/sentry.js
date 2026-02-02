/**
 * Sentry Configuration for Error Tracking and Performance Monitoring
 * 
 * Free Tier Limits:
 * - 5,000 errors/month
 * - 10,000 performance units/month
 * - 90-day data retention
 * 
 * Setup Instructions:
 * 1. Create account at https://sentry.io
 * 2. Create new project (Node.js)
 * 3. Copy DSN to .env file as SENTRY_DSN
 * 4. Set SENTRY_ENVIRONMENT (development/production)
 */

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry for backend error tracking
 * Call this BEFORE any other app code
 */
function initializeSentry(app) {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    console.log('   Set SENTRY_DSN in .env to enable Sentry');
    return;
  }

  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Profiling (optional - uses additional quota)
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Profiling integration
      nodeProfilingIntegration(),
      
      // HTTP integration for Express
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Express integration
      new Sentry.Integrations.Express({ app }),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive query params
      if (event.request?.query_string) {
        const sensitiveParams = ['password', 'token', 'apiKey', 'secret'];
        sensitiveParams.forEach(param => {
          if (event.request.query_string.includes(param)) {
            event.request.query_string = event.request.query_string.replace(
              new RegExp(`${param}=[^&]*`, 'gi'),
              `${param}=[REDACTED]`
            );
          }
        });
      }

      // Don't send errors in test environment
      if (process.env.NODE_ENV === 'test') {
        return null;
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser errors that shouldn't reach backend
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      
      // Network errors
      'NetworkError',
      'Network request failed',
      
      // Validation errors (expected)
      'ValidationError',
      
      // Rate limit errors (expected)
      'Too many requests',
    ],

    // Release tracking (optional - for tracking which version has bugs)
    release: process.env.SENTRY_RELEASE || `job-tracker-api@${require('../package.json').version}`,
  });

  console.log(`✅ Sentry initialized (${environment})`);
  console.log(`   Traces sample rate: ${environment === 'production' ? '10%' : '100%'}`);
}

/**
 * Get Sentry request handler middleware
 * Add this BEFORE all routes
 */
function getSentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing handler middleware
 * Add this AFTER request handler but BEFORE routes
 */
function getSentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 * Add this AFTER all routes but BEFORE custom error handler
 */
function getSentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only send 5xx errors to Sentry (server errors)
      // Don't send 4xx errors (client errors like validation)
      if (error.statusCode && error.statusCode < 500) {
        return false;
      }
      return true;
    },
  });
}

/**
 * Manually capture an exception
 * Use this for try-catch blocks where you want to log to Sentry
 */
function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message (for warnings, info)
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!process.env.SENTRY_DSN) return;
  
  Sentry.captureMessage(message, {
    level, // 'fatal', 'error', 'warning', 'log', 'info', 'debug'
    extra: context,
  });
}

module.exports = {
  initializeSentry,
  getSentryRequestHandler,
  getSentryTracingHandler,
  getSentryErrorHandler,
  captureException,
  captureMessage,
  Sentry, // Export for advanced usage
};


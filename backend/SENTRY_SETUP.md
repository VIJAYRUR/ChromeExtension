# Sentry Setup Guide

## What is Sentry?

Sentry is an error tracking and performance monitoring platform that helps you:
- **Catch bugs in production** before users report them
- **Track performance** issues (slow API endpoints, database queries)
- **Get detailed error reports** with stack traces, user context, and breadcrumbs
- **Set up alerts** for new errors or error spikes

## Free Tier Limits

- **5,000 errors/month** (plenty for small to medium apps)
- **10,000 performance units/month**
- **90-day data retention**
- **Unlimited projects**

## Setup Instructions

### Step 1: Create Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Click "Get Started" and sign up (free)
3. Choose "Node.js" as your platform
4. Create a new project named "job-tracker-api"

### Step 2: Get Your DSN

After creating the project, you'll see a **DSN (Data Source Name)** that looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

Copy this DSN - you'll need it for the next step.

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=job-tracker-api@1.0.0
```

**Important**: 
- Replace `SENTRY_DSN` with your actual DSN from Step 2
- Set `SENTRY_ENVIRONMENT` to `development` for local testing, `production` for live server
- Update `SENTRY_RELEASE` when you deploy new versions (helps track which version has bugs)

### Step 4: Test Sentry Integration

Start your server:
```bash
cd backend
npm start
```

You should see:
```
✅ Sentry initialized (production)
   Traces sample rate: 10%
```

### Step 5: Trigger a Test Error

To verify Sentry is working, you can trigger a test error:

**Option 1: Use the test endpoint (if you create one)**
```bash
curl http://localhost:3000/api/test-error
```

**Option 2: Manually trigger an error in your code**
```javascript
const { captureException } = require('./config/sentry');

try {
  throw new Error('Test error for Sentry');
} catch (error) {
  captureException(error, { test: true });
}
```

### Step 6: Check Sentry Dashboard

1. Go to [https://sentry.io](https://sentry.io)
2. Click on your "job-tracker-api" project
3. You should see the test error appear within a few seconds
4. Click on the error to see:
   - Stack trace
   - Request details
   - User context
   - Breadcrumbs (what happened before the error)

## What Errors Are Tracked?

### Automatically Tracked
- **Unhandled exceptions** (crashes)
- **Unhandled promise rejections**
- **5xx server errors** (500, 502, 503, etc.)
- **Database errors** (connection failures, query errors)
- **API errors** (failed external API calls)

### NOT Tracked (Filtered Out)
- **4xx client errors** (400, 401, 404) - these are expected user errors
- **Validation errors** - expected when users submit invalid data
- **Rate limit errors** - expected when users exceed limits
- **Test environment errors** - only production/development errors are sent

## Performance Monitoring

Sentry also tracks:
- **API endpoint response times** (which routes are slow?)
- **Database query performance** (which queries need optimization?)
- **External API calls** (is AWS S3 slow?)

### Sample Rates
- **Development**: 100% of requests tracked (see all performance data)
- **Production**: 10% of requests tracked (saves quota, still gives good insights)

## Setting Up Alerts

1. Go to Sentry dashboard → **Alerts**
2. Click "Create Alert Rule"
3. Recommended alerts:
   - **New Issue**: Alert when a new type of error appears
   - **Error Spike**: Alert when errors increase by 50% in 1 hour
   - **Performance Degradation**: Alert when API response time > 1 second

4. Configure notification channels:
   - Email (default)
   - Slack (recommended for teams)
   - Discord
   - PagerDuty (for critical apps)

## Best Practices

### 1. Add Context to Errors
```javascript
const { captureException } = require('./config/sentry');

try {
  await processPayment(userId, amount);
} catch (error) {
  captureException(error, {
    userId,
    amount,
    paymentMethod: 'stripe',
  });
}
```

### 2. Use Breadcrumbs
Breadcrumbs show what happened before an error:
```javascript
const { Sentry } = require('./config/sentry');

Sentry.addBreadcrumb({
  message: 'User started checkout',
  category: 'payment',
  level: 'info',
});
```

### 3. Filter Sensitive Data
The Sentry config already filters:
- Authorization headers
- Cookies
- Password fields
- API keys

### 4. Release Tracking
Update `SENTRY_RELEASE` when deploying:
```bash
# In your deployment script
export SENTRY_RELEASE="job-tracker-api@1.1.0"
```

This helps you know which version introduced a bug.

## Troubleshooting

### Sentry not initializing
**Symptom**: See "⚠️  Sentry DSN not configured"

**Solution**: Check that `SENTRY_DSN` is set in `.env` file

### Errors not appearing in Sentry
**Possible causes**:
1. **Wrong environment**: Check `SENTRY_ENVIRONMENT` matches your Sentry project
2. **Filtered out**: 4xx errors are intentionally filtered (only 5xx errors are sent)
3. **Test environment**: Errors in `NODE_ENV=test` are not sent
4. **Network issue**: Check server has internet access

### Too many errors (quota exceeded)
**Solutions**:
1. **Fix the bugs** causing errors (that's the point!)
2. **Reduce sample rate**: Lower `tracesSampleRate` in `config/sentry.js`
3. **Upgrade plan**: Sentry has paid plans with higher limits

## Cost Optimization

To stay within free tier:
- **Fix errors quickly** (fewer errors = lower quota usage)
- **Use 10% sample rate** in production (already configured)
- **Filter out noisy errors** (add to `ignoreErrors` in `config/sentry.js`)
- **Monitor quota** in Sentry dashboard → Settings → Quota

## Next Steps

After setup:
1. ✅ Monitor errors for 1 week
2. ✅ Set up Slack/Discord alerts
3. ✅ Fix top 5 most common errors
4. ✅ Add custom breadcrumbs to critical flows
5. ✅ Set up release tracking in CI/CD

---

**Need help?** Check [Sentry Docs](https://docs.sentry.io/platforms/node/) or ask in their Discord.


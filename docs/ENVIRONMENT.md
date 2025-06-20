# Environment Configuration Guide

This guide explains how to configure environment variables for the Survey Mobile App.

## Quick Setup

1. **Copy the template**:

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your actual values
3. **Restart the app** after making changes

## Required Environment Variables

### Backend API Configuration

```env
# Your backend API base URL (replace with your actual Vercel deployment URL)
API_BASE_URL=https://your-survey-backend-api.vercel.app/api/v1

# API Version (should match your backend)
API_VERSION=v1
```

**Example for your backend**:

```env
API_BASE_URL=https://survey-backend-api.vercel.app/api/v1
API_VERSION=v1
```

### Device Configuration

```env
# Default device configuration
DEFAULT_SURVEY_INTERVAL=5
DEFAULT_THEME=default
DEFAULT_LANGUAGE=en
```

### Sync Configuration

```env
# Background sync interval in minutes
BACKGROUND_SYNC_INTERVAL=5

# Maximum retry attempts for failed syncs
MAX_SYNC_RETRIES=5

# Base delay for exponential backoff (in milliseconds)
SYNC_BASE_DELAY=1000

# Maximum delay for exponential backoff (in milliseconds)
SYNC_MAX_DELAY=16000
```

### Network Configuration

```env
# API request timeout in milliseconds
API_TIMEOUT=10000

# Network connectivity check URL
NETWORK_CHECK_URL=https://www.google.com

# Network check timeout in milliseconds
NETWORK_CHECK_TIMEOUT=3000
```

## Optional Environment Variables

### App Configuration

```env
# App environment (development, staging, production)
NODE_ENV=development

# Enable/disable debug logging
DEBUG_MODE=true

# Enable/disable simulated API calls (set to false when connecting to real backend)
USE_SIMULATED_API=true
```

### Feature Flags

```env
# Enable/disable background sync
ENABLE_BACKGROUND_SYNC=true

# Enable/disable manual sync button
ENABLE_MANUAL_SYNC=true

# Enable/disable admin setup
ENABLE_ADMIN_SETUP=true

# Enable/disable triple-tap gesture
ENABLE_TRIPLE_TAP=true
```

### Database Configuration

```env
# SQLite database name
SQLITE_DB_NAME=survey.db

# AsyncStorage keys prefix
STORAGE_KEY_PREFIX=survey_app_
```

### UI Configuration

```env
# Default orientation lock
DEFAULT_ORIENTATION=landscape

# Status bar visibility
STATUS_BAR_HIDDEN=true
```

## Environment-Specific Configurations

### Development

```env
NODE_ENV=development
DEBUG_MODE=true
USE_SIMULATED_API=true
LOG_LEVEL=debug
ENABLE_CONSOLE_LOGS=true
```

### Production

```env
NODE_ENV=production
DEBUG_MODE=false
USE_SIMULATED_API=false
LOG_LEVEL=error
ENABLE_CONSOLE_LOGS=false
```

## Integration with Your Backend

To connect to your existing backend API:

1. **Update API Base URL**:

   ```env
   API_BASE_URL=https://your-actual-backend-url.vercel.app/api/v1
   ```

2. **Disable Simulated API**:

   ```env
   USE_SIMULATED_API=false
   ```

3. **Add Authentication** (if needed):
   ```env
   API_KEY=your-api-key-here
   JWT_SECRET=your-jwt-secret-here
   ```

## Using Environment Variables in Code

To use these environment variables in your React Native app, you'll need to install and configure `react-native-dotenv`:

1. **Install the package**:

   ```bash
   npm install react-native-dotenv
   ```

2. **Update babel.config.js**:

   ```javascript
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: ["babel-preset-expo"],
       plugins: [
         [
           "module:react-native-dotenv",
           {
             moduleName: "@env",
             path: ".env",
             blacklist: null,
             whitelist: null,
             safe: false,
             allowUndefined: true,
           },
         ],
       ],
     };
   };
   ```

3. **Import in your code**:
   ```typescript
   import { API_BASE_URL, USE_SIMULATED_API } from "@env";
   ```

## Example .env File

Here's a complete example for development:

```env
# Backend API
API_BASE_URL=https://survey-backend-api.vercel.app/api/v1
API_VERSION=v1

# Device Configuration
DEFAULT_SURVEY_INTERVAL=5
DEFAULT_THEME=default
DEFAULT_LANGUAGE=en

# Sync Configuration
BACKGROUND_SYNC_INTERVAL=5
MAX_SYNC_RETRIES=5
SYNC_BASE_DELAY=1000
SYNC_MAX_DELAY=16000

# Network Configuration
API_TIMEOUT=10000
NETWORK_CHECK_URL=https://www.google.com
NETWORK_CHECK_TIMEOUT=3000

# App Configuration
NODE_ENV=development
DEBUG_MODE=true
USE_SIMULATED_API=true

# Feature Flags
ENABLE_BACKGROUND_SYNC=true
ENABLE_MANUAL_SYNC=true
ENABLE_ADMIN_SETUP=true
ENABLE_TRIPLE_TAP=true

# Database Configuration
SQLITE_DB_NAME=survey.db
STORAGE_KEY_PREFIX=survey_app_

# UI Configuration
DEFAULT_ORIENTATION=landscape
STATUS_BAR_HIDDEN=true

# Logging
LOG_LEVEL=debug
ENABLE_CONSOLE_LOGS=true
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use different values** for development, staging, and production
3. **Rotate API keys** regularly
4. **Use environment-specific** backend URLs

## Troubleshooting

### Environment Variables Not Loading

- Ensure `.env` file is in the root directory
- Restart the development server after changes
- Check for typos in variable names

### API Connection Issues

- Verify `API_BASE_URL` is correct
- Check network connectivity
- Ensure backend is running and accessible

### Sync Issues

- Verify `USE_SIMULATED_API` is set correctly
- Check `BACKGROUND_SYNC_INTERVAL` value
- Monitor console logs for sync errors

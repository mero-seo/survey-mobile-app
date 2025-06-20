# Survey Mobile App

A React Native mobile application built with Expo for collecting customer satisfaction surveys. The app features offline-first capabilities with real-time synchronization, landscape orientation, and robust data management.

## Features

### Core Features

- **Offline-First Survey Collection**: Surveys are stored locally using SQLite and synced when online
- **Real-time Synchronization**: Background sync every 5 minutes with exponential backoff retry logic
- **Device Configuration**: Admin setup with triple-tap gesture for device location and settings
- **Landscape Orientation**: Optimized for tablet use in landscape mode
- **Status Monitoring**: Real-time display of sync status, pending surveys, and device location
- **Real Backend Integration**: Direct connection to your Survey Backend API

### Technical Features

- **SQLite Storage**: Local survey data storage with sync status tracking
- **AsyncStorage**: Device configuration persistence
- **Background Sync**: Automatic synchronization with retry logic
- **Network Monitoring**: Online/offline status detection
- **Admin Setup**: Triple-tap gesture to access device configuration
- **Production Ready**: Optimized for real-world deployment

## Installation

### Prerequisites

- Node.js (>= 18.x)
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd survey-mobile-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Install additional required packages**

   ```bash
   npx expo install expo-sqlite @react-native-async-storage/async-storage expo-screen-orientation
   npm install axios react-native-dotenv
   ```

4. **Configure environment variables**

   ```bash
   # Create .env file
   echo "API_BASE_URL=https://your-survey-backend-api.vercel.app/api/v1" > .env
   ```

5. **Start the development server**

   ```bash
   npm start
   ```

6. **Run on device/simulator**

   ```bash
   # For Android
   npm run android

   # For iOS
   npm run ios
   ```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in your project root:

```env
# Your backend API base URL (replace with your actual Vercel deployment URL)
API_BASE_URL=https://your-survey-backend-api.vercel.app/api/v1
```

### Example Configuration

```env
# Development
API_BASE_URL=https://survey-backend-api.vercel.app/api/v1

# Production
API_BASE_URL=https://your-production-backend.vercel.app/api/v1
```

### Important Notes

- **Never commit `.env` files** to version control
- **Update API_BASE_URL** with your actual backend deployment URL
- **Restart the app** after changing environment variables
- **For APK builds**, see the "Building for Production" section below

## Usage

### Initial Setup

1. **First Launch**: The app will prompt for device configuration
2. **Admin Setup**: Triple-tap anywhere on the screen to open admin setup
3. **Configure Device**: Set device name and location
4. **Start Collecting**: Begin collecting surveys

### Survey Collection

1. **Submit Survey**: Users can select from Excellent, Satisfactory, or Average
2. **Offline Storage**: Surveys are stored locally even when offline
3. **Auto Sync**: Surveys automatically sync when connection is restored
4. **Manual Sync**: Use the "Sync" button in the status bar for immediate sync

### Admin Features

- **Triple-tap Gesture**: Access admin setup from anywhere in the app
- **Device Configuration**: Set device name, location, and other settings
- **Location Management**: Choose from predefined locations or enter custom location
- **Status Monitoring**: View sync status, pending surveys count, and device location

## Architecture

### Data Flow

1. **Survey Submission** → SQLite Storage (pending)
2. **Background Sync** → Real API Submission
3. **Success** → Mark as synced, cleanup local data
4. **Failure** → Increment retry count, exponential backoff

### Storage

- **SQLite**: Survey data with sync status tracking
- **AsyncStorage**: Device configuration and settings
- **Context**: Global state management for UI updates

### Sync Strategy

- **Immediate**: On survey submission (if online)
- **Background**: Every 5 minutes
- **App State**: When app becomes active
- **Manual**: Via sync button
- **Retry Logic**: Exponential backoff (1s → 16s max)

## Backend Integration

The app is designed to work with your Survey Backend API. The integration includes:

### API Endpoints Used

- `POST /api/v1/surveys/submit` - Submit survey responses
- `POST /api/v1/devices/register` - Register new devices
- `PUT /api/v1/devices/:id` - Update device configuration
- `GET /health` - Health check for connectivity

### Data Models

The app sends data in the format expected by your backend:

- Survey submissions with deviceId, location, answer, timestamp
- Device registration with configuration details
- Proper error handling and retry logic

## Building for Production

### APK Build Configuration

For APK builds, environment variables need to be configured differently:

1. **Install EAS CLI**:

   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Configure EAS**:

   ```bash
   eas build:configure
   ```

3. **Update eas.json** to include environment variables:

   ```json
   {
     "build": {
       "production": {
         "env": {
           "API_BASE_URL": "https://your-production-backend.vercel.app/api/v1"
         }
       },
       "development": {
         "env": {
           "API_BASE_URL": "https://your-development-backend.vercel.app/api/v1"
         }
       }
     }
   }
   ```

4. **Build APK**:

   ```bash
   # Development build
   eas build --platform android --profile development

   # Production build
   eas build --platform android --profile production
   ```

### Environment Variables in APK

- **Development builds**: Use `.env` file
- **Production builds**: Use `eas.json` environment configuration
- **Runtime**: Environment variables are embedded in the APK

## Development

### Project Structure

```
survey-mobile-app/
├── app/                    # Expo Router pages
├── components/             # React components
├── context/               # React Context providers
├── hooks/                 # Custom React hooks
├── services/              # Business logic services
├── constants/             # App constants
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
├── .env                   # Environment variables
└── eas.json              # EAS build configuration
```

### Key Files

- `services/surveyStorage.ts`: SQLite operations for surveys
- `services/configStorage.ts`: AsyncStorage for device config
- `services/syncService.ts`: Real API sync logic
- `services/backgroundSync.ts`: Background sync service
- `context/SurveyContext.tsx`: Global state management
- `hooks/useTripleTap.ts`: Triple-tap gesture detection
- `components/AdminSetup.tsx`: Device configuration UI

## Troubleshooting

### Common Issues

1. **API connection failed**: Verify `API_BASE_URL` in `.env` or `eas.json`
2. **SQLite not working**: Ensure `expo-sqlite` is properly installed
3. **Orientation not locked**: Check `expo-screen-orientation` installation
4. **Sync not working**: Verify network connectivity and backend status
5. **Admin setup not accessible**: Try triple-tapping in different areas

### Debug Mode

- Check console logs for sync status and errors
- Monitor network requests in development tools
- Verify SQLite database contents
- Check backend API health endpoint

### Environment Variables Not Working

- **Development**: Ensure `.env` file exists and has correct values
- **Production**: Check `eas.json` environment configuration
- **APK**: Environment variables are embedded during build

## Security

- **API Keys**: Never hardcode sensitive information
- **Environment Variables**: Use different values for dev/staging/production
- **Backend Security**: Ensure your backend has proper authentication
- **Data Protection**: All local data is encrypted by SQLite

## License

[Add your license information here]

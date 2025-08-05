# Mobile App Wrapping Guide

This document explains how to wrap the Refunite Network web app for native mobile platforms.

## Overview

The app has been configured for static export with offline-first capabilities, making it suitable for wrapping in native mobile containers like WebView or Capacitor.

## Features

### Offline-First Architecture

- **Service Worker**: Handles offline caching and background sync
- **Offline Queue**: Queues API calls when offline, syncs when online
- **Local Storage**: Caches user data and form inputs
- **Static API Generation**: Pre-generates static API responses during build

### Mobile Optimizations

- **PWA Manifest**: Configured for mobile app installation
- **Touch-Friendly UI**: Optimized for mobile interactions
- **Responsive Design**: Works on all screen sizes
- **Mobile Meta Tags**: Proper viewport and app configuration

## Build Process

### Environment-Based Configuration

The app uses environment variables to determine build target:

```bash
# Web build (default)
npm run build:web

# Mobile build (for Capacitor)
npm run build:mobile
```

### Build Targets

- **Web**: Standard Next.js build with server-side rendering
- **Mobile**: Static export optimized for Capacitor with offline support

### 1. Static Export (Mobile Only)

```bash
# Build the app with static API generation for mobile
npm run build:mobile

# The output will be in the `out/` directory
```

### 2. Static API Generation

The mobile build process automatically generates static API responses for:

- `/api/health` - Health check endpoint
- `/api/metrics` - Basic metrics endpoint

### 3. Service Workers

- **Web**: `public/sw.js` - Standard service worker for web browsers
- **Mobile**: `public/sw-capacitor.js` - Capacitor-optimized service worker

Both provide:

- Offline caching of static assets
- API request handling when offline
- Background sync capabilities
- Push notification support

## Native Mobile Wrapping Options

### Option 1: Capacitor (Recommended)

The app is now configured with Capacitor-specific optimizations and build scripts.

1. **Initialize Capacitor** (first time only):

```bash
npm run capacitor:init
```

2. **Add Platforms**:

```bash
npm run capacitor:add-ios
npm run capacitor:add-android
```

3. **Build for Mobile**:

```bash
npm run build:mobile
```

4. **Sync with Capacitor**:

```bash
npm run capacitor:sync
```

5. **Open in Native IDEs**:

```bash
npm run capacitor:open-ios    # Opens Xcode
npm run capacitor:open-android # Opens Android Studio
```

The Capacitor configuration is already set up in `capacitor.config.ts` with:

- Mobile-optimized settings
- Proper WebView configuration
- Offline support
- Service worker integration

### Option 2: React Native WebView

1. **Create React Native App**:

```bash
npx react-native init RefuniteMobile
```

2. **Add WebView**:

```bash
npm install react-native-webview
```

3. **Configure WebView**:

```typescript
// App.tsx
import React from 'react';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <WebView
      source={{ uri: 'file:///path/to/your/out/index.html' }}
      originWhitelist={['*']}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      allowFileAccessFromFileURLs={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      scalesPageToFit={true}
      mixedContentMode="compatibility"
    />
  );
}
```

### Option 3: Flutter WebView

1. **Add WebView Dependency**:

```yaml
# pubspec.yaml
dependencies:
  webview_flutter: ^4.0.0
```

2. **Configure WebView**:

```dart
// main.dart
import 'package:webview_flutter/webview_flutter.dart';

class MyHomePage extends StatefulWidget {
  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadFlutterAsset('assets/out/index.html');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Refunite Network')),
      body: WebViewWidget(controller: controller),
    );
  }
}
```

## Offline Functionality

### How It Works

1. **Online Mode**: App works normally with real-time API calls
2. **Offline Mode**:
   - API calls are queued in localStorage
   - Static content is served from cache
   - User can continue using the app
3. **Sync Mode**: When online again, queued actions are processed

### API Handling

- **Static APIs**: Pre-generated during build (health, metrics)
- **Dynamic APIs**: Queued when offline, processed when online
- **Database Operations**: Stored locally, synced when possible

### User Experience

- **Offline Indicator**: Shows when user is offline
- **Queue Status**: Displays pending actions
- **Auto-Sync**: Automatically syncs when connection restored
- **Manual Sync**: Users can manually trigger sync

## Configuration

### Environment Variables

```bash
# .env.local
BUILD_TARGET=mobile  # Set to 'mobile' for Capacitor builds
NEXT_PUBLIC_OFFLINE_MODE=true
NEXT_PUBLIC_CACHE_TTL=300000  # 5 minutes
NEXT_PUBLIC_MAX_QUEUE_SIZE=100
```

### Build Configuration

The app uses conditional configuration in `next.config.ts`:

**Web Build** (`BUILD_TARGET=web` or unset):

- Standard Next.js build
- Server-side rendering enabled
- Dynamic API routes

**Mobile Build** (`BUILD_TARGET=mobile`):

- `output: "export"` - Enables static export
- `distDir: "out"` - Output directory
- Capacitor-specific optimizations
- Console removal in production
- WebView fallbacks for Node.js modules
- **Note**: Security headers are skipped (static export limitation)

## Testing

### Offline Testing

1. Build the app: `npm run build`
2. Serve the static files: `npx serve out`
3. Open browser dev tools
4. Go to Network tab and check "Offline"
5. Test app functionality

### Mobile Testing

1. Use browser dev tools device simulation
2. Test on actual mobile devices
3. Test offline/online transitions
4. Verify PWA installation

## Troubleshooting

### Common Issues

1. **Service Worker Not Registering**: Check HTTPS/localhost
2. **Offline Queue Not Working**: Verify localStorage is enabled
3. **Static APIs Not Loading**: Check build script execution
4. **Mobile Wrapping Issues**: Ensure proper WebView configuration

### Debug Commands

```bash
# Check static API generation
npm run generate-static-apis

# Clear offline data
# (In browser console)
localStorage.clear()

# Check service worker
# (In browser dev tools > Application > Service Workers)
```

## Security Considerations

### Web Build

1. **Content Security Policy**: Configured via Next.js headers
2. **Frame Options**: Set to prevent clickjacking
3. **Referrer Policy**: Configured for privacy
4. **HTTPS Required**: Service worker requires secure context

### Mobile Build

Since static export doesn't support custom headers, security is handled differently:

1. **Capacitor Configuration**: Security headers configured in `capacitor.config.ts`
2. **WebView Settings**: Android/iOS WebView security settings
3. **HTTPS Enforcement**: Configured in Capacitor server settings
4. **Content Security**: Handled by the hosting server serving static files

**For Production Mobile Apps:**

- Configure security headers on your CDN/hosting service
- Use Capacitor's built-in security features
- Consider using a reverse proxy for additional security headers

## Performance Optimization

1. **Static Generation**: Pre-renders pages at build time
2. **Image Optimization**: Unoptimized for static export
3. **Code Splitting**: Automatic with Next.js
4. **Caching Strategy**: Aggressive caching for offline use

## Deployment

### Static Hosting

The `out/` directory can be deployed to:

- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Any static hosting service

### Mobile App Stores

1. Build native app using Capacitor/React Native/Flutter
2. Test thoroughly on devices
3. Submit to App Store/Google Play
4. Monitor offline functionality in production

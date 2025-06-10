# AI Automator App Plan

This document outlines the implementation plan for an AI Automator app using React Native (Expo) and Android Accessibility Services to automate screen touches via AI instructions.

## Key Features
1. Capture device screenshots
2. Send screenshot to AI for analysis
3. Receive AI tool calls with touch coordinates
4. Automate screen touches using Android Accessibility APIs

## Implementation Steps

### 1. Android Native Module for Accessiblity (New File)
- Create `AutomatorModule.kt` in `android/app/src/main/java/com/supastishn/aitomator/`
- Implement methods for:
  - `takeScreenshot()` - captures current screen
  - `performTouch(x: Float, y: Float)` - simulates tap at coordinates
- Register module in `MainApplication.kt`

### 2. Expo Config Updates
- Add `expo-screen-capture` to package.json for screenshot permissions
- Configure `app.json` with needed permissions:
  ```json
  "android": {
    "permissions": ["android.permission.WRITE_EXTERNAL_STORAGE"]
  }
  ```

### 3. AI Integration Service (New File)
- Create `services/aiProcessor.ts`:
  - Send screenshot to AI endpoint
  - Process tool call response with coordinates
  - Return parsed touch points

### 4. Main Automator Screen (Replace app/(tabs)/index.tsx)
- Add buttons:
  - "Capture Screen" - invokes screenshot capture
  - "Run Automation" - sends to AI and executes tool calls
- Display preview of captured screenshot

### 5. Coordinate Processing Logic
- Import `react-native-view-shot` for screen capture
- Translate screen coordinates to device dimensions
- Pass coordinates to native module

### 6. Android Manifest Updates
- Add accessibility service declaration:
  ```xml
  <service 
    android:name=".AutomatorService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
    <intent-filter>
      <action android:name="android.accessibilityservice.AccessibilityService"/>
    </intent-filter>
    <meta-data 
      android:name="android.accessibilityservice"
      android:resource="@xml/accessibility_config"/>
  </service>
  ```

## Dependency Installation
```bash
npm install react-native-view-shot
npx expo install expo-media-library
```

## Accessibility Service Files
- Create `AutomatorService.kt` to handle touch events
- Add `accessibility_config.xml` to res/xml

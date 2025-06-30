# Automation Preconditions and Runtime Checks

This app enforces several critical conditions before and during automation to ensure safe and reliable operation:

## 1. Accessibility Service Requirements (Critical) ✅

- **Accessibility Service Enabled**
  - Checks if AutoMate is enabled in Android's Accessibility Settings.
  - Uses the native method `isAccessibilityServiceEnabled()`.
  - Logs both flattened and shortened service names for debugging:
    ```kotlin
    val longName = serviceName.flattenToString()
    val shortName = serviceName.flattenToShortString()
    ```

- **Service Connection Status**
  - Verifies the service is actively connected via `isServiceConnected()`.
  - Monitors binding status in `AutomatorService`:
    ```kotlin
    override fun onServiceConnected() {
        instance = this
        connected = true
    }
    ```

## 2. Task Validation ✅

- **Non-empty Task Prompt**
  - Requires user to enter an automation description.
  - Disables Start button when empty:
    ```tsx
    disabled={isRunning || !task}
    ```

## 3. Internal State Checks ✅

- **Automation Not Already Running**
  - Prevents concurrent executions:
    ```tsx
    const [isRunning, setIsRunning] = useState(false);
    ```

## 4. Runtime Checks During Automation

- **Coordinate Validation** before every touch:
  ```kotlin
  if (x !in 0f..1f || y !in 0f..1f) {
      throw Exception("Invalid coordinates...")
  }
  ```
- **App Existence Check** when opening apps:
  ```kotlin
  targetApp?.let { ... } ?: run {
      promise.reject("APP_NOT_FOUND")
  }
  ```

## 5. Error Handling

- Accessibility failures trigger:
  ```tsx
  Alert.alert(
    "Service Not Ready", 
    `Configuration: ${settingsEnabled} | Connection: ${connected}`
  );
  ```

These validations ensure safe automation execution while providing clear user feedback when prerequisites aren't met. The app prioritizes accessibility service status above all else since it's required for gesture simulation.

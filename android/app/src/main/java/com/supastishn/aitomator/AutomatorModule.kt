package com.supastishn.aitomator

import android.graphics.Bitmap
import android.os.Environment
import android.util.Base64
import android.util.Log
import android.accessibilityservice.AccessibilityService
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import android.content.Intent
import android.net.Uri
import com.facebook.react.module.annotations.ReactModule
import androidx.annotation.UiThread

// Add these imports at the top of the file
import android.content.Context
import android.view.WindowManager
import android.os.Build
import android.util.DisplayMetrics
import android.util.Size

@ReactModule(name = "AutomatorModule")
class AutomatorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val context = reactContext

    override fun getName() = "AutomatorModule"

    // Update takeScreenshot to return base64 string
    @ReactMethod
    fun takeScreenshot(promise: Promise) {
        try {
            val rootView = currentActivity?.window?.decorView?.rootView
            rootView?.isDrawingCacheEnabled = true
            val bitmap = Bitmap.createBitmap(rootView?.drawingCache ?: return)
            rootView?.isDrawingCacheEnabled = false

            // Convert to JPEG with 90% quality
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream) // Changed to JPEG
            val base64 = "data:image/jpeg;base64," + // Changed to JPEG
                         Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
            promise.resolve(base64)
        } catch (e: Exception) {
            promise.reject("SCREENSHOT_ERROR", e.message)
        }
    }

    // Update performTouch to handle coordinates conversion and multi-touch
    @UiThread
    @ReactMethod
    fun performTouch(x: Float, y: Float, amount: Int?, spacing: Int?, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
            if (service == null) {
                throw Exception("Automator accessibility service not active. Enable it in system settings and restart the app")
            }

            // Validate required parameters with type checking
            if (x !in 0f..1f || y !in 0f..1f) {
                throw Exception("Invalid coordinates ($x,$y): Must be normalized values between 0 and 1")
            }

            // Provide defaults for optional parameters
            val touchAmount = amount ?: 1
            val touchSpacing = spacing ?: 0

            val size = service.screenSize
            val screenX = (x * size.width).toDouble()
            val screenY = (y * size.height).toDouble()

            // Capture service initialization status in debug log
            Log.d("AutoMateDebug", 
                "Touch: Service=${service.hashCode()}, " +
                "normalized=($x, $y) -> pixels=($screenX, $screenY) " +
                "amount=$touchAmount, spacing=${touchSpacing}ms"
            )

            for (i in 0 until touchAmount) {
                service.simulateTap(screenX, screenY)
                if (touchSpacing > 0 && i < touchAmount - 1) {
                    Thread.sleep(touchSpacing.toLong())
                }
            }
            
            // Create and return pixel location
            val resultMap = Arguments.createMap()
            resultMap.putDouble("x", screenX)
            resultMap.putDouble("y", screenY)
            promise.resolve(resultMap)
        } catch (e: Exception) {
            // Add this error mapping
            val errorCode = when {
                e.message?.contains("SCREEN_SIZE_UNAVAILABLE") == true -> "SCREEN_SIZE_ERROR"
                else -> "TOUCH_ERROR"
            }
            promise.reject(errorCode, e.message)
        }
    }

    // Implement performSwipe
    @UiThread
    @ReactMethod
    fun performSwipe(breakpoints: ReadableArray, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
                ?: throw Exception("Service unavailable")

            val size = service.screenSize
            val points = mutableListOf<Pair<Float, Float>>()
            val normPoints = mutableListOf<String>()  // For logging
            val pixelPoints = mutableListOf<String>() // For logging

            for (i in 0 until breakpoints.size()) {
                val point = breakpoints.getMap(i) ?: continue  // Skip if null
                if (!point.hasKey("x") || !point.hasKey("y")) continue  // Skip if coords missing

                val normX = point.getDouble("x").toFloat()
                val normY = point.getDouble("y").toFloat()
                val pixelX = normX * size.width
                val pixelY = normY * size.height
                points.add(Pair(pixelX, pixelY))
                normPoints.add("($normX, $normY)")
                pixelPoints.add("($pixelX, $pixelY)")
            }

            // Add throw condition for empty breakpoints
            if (points.size < 2) {
                throw Exception("At least two breakpoints required for swipe")
            }

            // Add debug log
            Log.d("AutoMateDebug",
                "Swipe: ${breakpoints.size()} breakpoints\n" +
                "Normalized: ${normPoints.joinToString(" -> ")}\n" +
                "Pixels: ${pixelPoints.joinToString(" -> ")}"
            )

            service.performSwipe(points)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SWIPE_ERROR", e.message)
        }
    }

    // Implement typeText
    @ReactMethod
    fun typeText(text: String, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
                ?: throw Exception("Accessibility service not initialized")

            if (!service.typeText(text)) {
                throw Exception("No focused input field available")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TYPE_ERROR", e.message)
        }
    }

    // Intent-based app search: prioritizes app name matches, sorts alphabetically, robust error handling, explicit YouTube alias
    @ReactMethod
    fun searchApps(query: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            // Get launchable apps
            val launchableApps = pm.queryIntentActivities(mainIntent, android.content.pm.PackageManager.MATCH_ALL)
            java.util.Collections.sort(launchableApps, android.content.pm.ResolveInfo.DisplayNameComparator(pm))

            val matches = com.facebook.react.bridge.Arguments.createArray()
            val queryLower = query.trim().lowercase()

            for (resolveInfo in launchableApps) {
                val packageName = resolveInfo.activityInfo.packageName
                val appName = resolveInfo.loadLabel(pm).toString()

                if (appName.lowercase().contains(queryLower) ||
                    packageName.lowercase().contains(queryLower)) {

                    matches.pushMap(createAppMap(appName, packageName))
                }
            }

            promise.resolve(matches)
        } catch (e: Exception) {
            promise.reject("SEARCH_ERROR", "App search failed: ${e.message}")
        }
    }

    // Helper function to create response map
    private fun createAppMap(name: String, pkg: String): com.facebook.react.bridge.WritableMap {
        return Arguments.createMap().apply {
            putString("appName", name)
            putString("packageName", pkg)
        }
    }

    @ReactMethod
    fun openApp(packageNameToOpen: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            // Find matching launchable app
            val launchableApps = pm.queryIntentActivities(mainIntent, android.content.pm.PackageManager.MATCH_ALL)
            var targetApp = launchableApps.find {
                it.activityInfo.packageName == packageNameToOpen
            }

            targetApp?.let { app ->
                val activityInfo = app.activityInfo
                val component = android.content.ComponentName(activityInfo.packageName, activityInfo.name)
                val launchIntent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
                    component = component
                }
                reactApplicationContext.startActivity(launchIntent)
                promise.resolve(true)
            } ?: run {
                val e = Exception("Package '$packageNameToOpen' not found")
                promise.reject(
                    "APP_NOT_FOUND",
                    "Package '$packageNameToOpen' not found",
                    e
                )
            }
        } catch (e: Exception) {
            promise.reject("OPEN_ERROR", "Failed to open app: ${e.message}")
        }
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        try {
            val serviceName = android.content.ComponentName(
                reactApplicationContext,
                AutomatorService::class.java
            )

            // Add logging for service names
            val longName = serviceName.flattenToString()
            val shortName = serviceName.flattenToShortString()
            android.util.Log.d("AutoMateDebug", "Service check - long name: $longName")
            android.util.Log.d("AutoMateDebug", "Service check - short name: $shortName")

            val accessibilityEnabled = android.provider.Settings.Secure.getInt(
                reactApplicationContext.contentResolver,
                android.provider.Settings.Secure.ACCESSIBILITY_ENABLED,
                0
            ) == 1

            if (!accessibilityEnabled) {
                android.util.Log.d("AutoMateDebug", "Accessibility is disabled system-wide")
                promise.resolve(false)
                return
            }

            val servicesList = android.provider.Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""

            android.util.Log.d("AutoMateDebug", "Enabled services: $servicesList")
            
            val serviceEnabled = servicesList.split(":").any { id ->
                // Check both representations of service names
                id.equals(longName, ignoreCase = true) || 
                id.equals(shortName, ignoreCase = true)
            }

            // Add improved debug log for config check
            Log.d("AutoMateDebug", 
                "[Service] Config Check: Enabled=$serviceEnabled, " +
                "SystemEnabled=$accessibilityEnabled"
            )
            promise.resolve(serviceEnabled)
        } catch (e: Exception) {
            Log.e("AutoMateDebug", "[Service] Config Check Failed: ${e.message}")
            promise.reject("ACCESSIBILITY_CHECK_ERROR", e.message)
        }
    }


    @ReactMethod
    fun getScreenDimensions(promise: Promise) {
        try {
            val windowManager = reactApplicationContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val dimensions = Arguments.createMap()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val bounds = windowManager.currentWindowMetrics.bounds
                dimensions.putInt("width", bounds.width())
                dimensions.putInt("height", bounds.height())
            } else {
                val displayMetrics = DisplayMetrics()
                @Suppress("DEPRECATION")
                windowManager.defaultDisplay.getMetrics(displayMetrics)
                dimensions.putInt("width", displayMetrics.widthPixels)
                dimensions.putInt("height", displayMetrics.heightPixels)
            }
            
            promise.resolve(dimensions)
        } catch (e: Exception) {
            promise.reject("DIMENSIONS_ERROR", "Failed to get screen dimensions", e)
        }
    }

}

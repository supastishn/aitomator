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
import com.facebook.react.module.annotations.ReactModule

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
    @ReactMethod
    fun performTouch(x: Float, y: Float, amount: Int, spacing: Int, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
                ?: throw Exception("Service unavailable")
            service.screenSize
                ?: throw Exception("Screen size unavailable")

            val size = service.screenSize!!
            val screenX = x * size.width
            val screenY = y * size.height

            for (i in 0 until amount) {
                service.simulateTap(screenX, screenY)
                if (spacing > 0 && i < amount - 1) {
                    Thread.sleep(spacing.toLong())
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TOUCH_ERROR", e.message)
        }
    }

    // Implement performSwipe
    @ReactMethod
    fun performSwipe(breakpoints: ReadableArray, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
                ?: throw Exception("Service unavailable")
            service.screenSize
                ?: throw Exception("Screen size unavailable")

            val size = service.screenSize!!
            val points = mutableListOf<Pair<Float, Float>>()

            for (i in 0 until breakpoints.size()) {
                val point = breakpoints.getMap(i) ?: continue  // Skip if null
                if (!point.hasKey("x") || !point.hasKey("y")) continue  // Skip if coords missing

                val x = point.getDouble("x").toFloat() * size.width
                val y = point.getDouble("y").toFloat() * size.height
                points.add(Pair(x, y))
            }
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

    // Enhanced app search: prioritizes app name matches, sorts alphabetically, robust error handling
    @ReactMethod
    fun searchApps(query: String, promise: Promise) {
        try {
            val queryNormalized = query.trim()
            val context = reactApplicationContext
            val pm = context.packageManager

            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val launchableApps = pm.queryIntentActivities(mainIntent, android.content.pm.PackageManager.MATCH_ALL)
            val matches = Arguments.createArray()
            val defaultComparator = android.content.pm.ResolveInfo.DisplayNameComparator(pm)

            // Sort alphabetically by display name
            java.util.Collections.sort(launchableApps, defaultComparator)

            for (resolveInfo in launchableApps) {
                val activityInfo = resolveInfo.activityInfo
                val packageName = activityInfo.packageName
                val appName = resolveInfo.loadLabel(pm).toString()

                // Prioritize app name matches first
                if (appName.contains(queryNormalized, ignoreCase = true)) {
                    matches.pushMap(createAppMap(appName, packageName))
                }
                // Then package name matches
                else if (packageName.contains(queryNormalized, ignoreCase = true)) {
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

    // Enhanced openApp: explicit component-based launching, robust error handling
    @ReactMethod
    fun openApp(packageName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.packageManager
            val mainIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }

            val launchables = pm.queryIntentActivities(mainIntent, android.content.pm.PackageManager.MATCH_ALL)
            var targetInfo: android.content.pm.ResolveInfo? = null

            // Find matching app
            for (resolveInfo in launchables) {
                if (resolveInfo.activityInfo.packageName == packageName) {
                    targetInfo = resolveInfo
                    break
                }
            }

            targetInfo?.let {
                val activityInfo = it.activityInfo
                val name = android.content.ComponentName(activityInfo.packageName, activityInfo.name)
                val intent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
                    component = name
                }
                context.startActivity(intent)
                promise.resolve(true)
            } ?: run {
                promise.reject("APP_NOT_FOUND", "Package $packageName not found")
            }
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", "Failed to launch app: ${e.message}")
        }
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        try {
            val context = reactApplicationContext
            val enabledServices = android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            val expectedService = "${context.packageName}/${AutomatorService::class.qualifiedName}"
            val isEnabled = enabledServices?.contains(expectedService) == true
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("ACCESSIBILITY_CHECK_ERROR", e.message)
        }
    }
}

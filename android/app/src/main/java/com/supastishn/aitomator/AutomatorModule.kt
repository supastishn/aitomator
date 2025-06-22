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

            // Convert to base64
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            val base64 = Base64.encodeToString(stream.toByteArray(), Base64.DEFAULT)
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
            service?.screenSize?.let { size ->
                val screenX = x * size.width
                val screenY = y * size.height

                for (i in 0 until amount) {
                    service.simulateTap(screenX, screenY)
                    if (spacing > 0 && i < amount - 1) {
                        Thread.sleep(spacing.toLong())
                    }
                }
                promise.resolve(true)
            } ?: throw Exception("Screen size not available")
        } catch (e: Exception) {
            promise.reject("TOUCH_ERROR", e.message)
        }
    }

    // Implement performSwipe
    @ReactMethod
    fun performSwipe(breakpoints: ReadableArray, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
            service?.screenSize?.let { size ->
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
            } ?: throw Exception("Screen size not available")
        } catch (e: Exception) {
            promise.reject("SWIPE_ERROR", e.message)
        }
    }

    // Implement typeText
    @ReactMethod
    fun typeText(text: String, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
            service?.typeText(text)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TYPE_ERROR", e.message)
        }
    }

    // Implement searchApps
    @ReactMethod
    fun searchApps(query: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val packages = context.packageManager.getInstalledPackages(0)
            val matches = Arguments.createArray()

            for (pkg in packages) {
                val appInfo = pkg.applicationInfo ?: continue  // Skip if null

                val appName = appInfo.loadLabel(context.packageManager)?.toString() ?: continue
                val packageName = appInfo.packageName ?: continue

                if (appName.contains(query, true)) {
                    val appMap = Arguments.createMap()
                    appMap.putString("appName", appName)
                    appMap.putString("packageName", packageName)
                    matches.pushMap(appMap)
                }
            }

            promise.resolve(matches)
        } catch (e: Exception) {
            promise.reject("SEARCH_APPS_ERROR", e.message)
        }
    }

    // Implement openApp
    @ReactMethod
    fun openApp(packageName: String, promise: Promise) {
        try {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.reject("APP_NOT_FOUND", "Application not found")
            }
        } catch (e: Exception) {
            promise.reject("OPEN_APP_ERROR", e.message)
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

package com.supastishn.aitomator

import android.graphics.Bitmap
import android.os.Environment
import android.util.Log
import android.accessibilityservice.AccessibilityService
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileOutputStream

class AutomatorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // Add to class variables
    private lateinit var accessibilityService: AccessibilityService

    override fun getName() = "AutomatorModule"

    @ReactMethod
    fun takeScreenshot(promise: Promise) {
        try {
            val rootView = currentActivity?.window?.decorView?.rootView
            rootView?.isDrawingCacheEnabled = true
            val bitmap = Bitmap.createBitmap(rootView?.drawingCache ?: return)
            rootView?.isDrawingCacheEnabled = false

            val filename = "screenshot_${System.currentTimeMillis()}.png"
            val output = File(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_PICTURES), filename)

            FileOutputStream(output).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            promise.resolve(output.absolutePath)
            Log.d("Automator", "Screenshot saved to ${output.absolutePath}")
        } catch (e: Exception) {
            promise.reject("SCREENSHOT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun performTouch(x: Float, y: Float, promise: Promise) {
        try {
            val service = AutomatorService.getInstance()
            if (service != null) {
                service.simulateTap(x, y)
                promise.resolve(true)
            } else {
                promise.reject("SERVICE_NOT_READY", "Accessibility service not initialized")
            }
        } catch (e: Exception) {
            promise.reject("TOUCH_ERROR", e.message)
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

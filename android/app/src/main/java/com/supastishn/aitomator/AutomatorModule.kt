package com.supastishn.aitomator

import android.graphics.Bitmap
import android.os.Environment
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileOutputStream

class AutomatorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

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
        // Stub for now - requires AccessibilityService implementation
        Log.d("Automator", "Touch simulation at ($x, $y)")
        promise.resolve(true)
    }
}

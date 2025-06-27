package com.supastishn.aitomator

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.PointF
import android.graphics.Rect
import android.os.Bundle
import android.util.Size
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AutomatorService : AccessibilityService() {
    var screenSize: Size? = null  // Initialize as nullable

    // Get dimensions safely with fallbacks
    private fun getScreenDimensions(): Size {
        return try {
            Size(
                resources.displayMetrics.widthPixels,
                resources.displayMetrics.heightPixels
            )
        } catch (e: Exception) {
            // Use common screen dimensions as fallback
            Size(1080, 1920)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Handle accessibility events
    }

    override fun onInterrupt() {
        // Handle interruption
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        screenSize = getScreenDimensions()  // Get dimensions when service is ready
    }

    fun simulateTap(x: Float, y: Float) {
        screenSize?.let { size ->
            val maxX = size.width.toFloat()
            val maxY = size.height.toFloat()
            
            if (x < 0 || x > maxX || y < 0 || y > maxY) {
                throw Exception("Coordinates ($x,$y) out of bounds for screen $maxX,$maxY")
            }
            
            val path = Path()
            path.moveTo(x, y)
            val gesture = GestureDescription.Builder()
                .addStroke(GestureDescription.StrokeDescription(path, 0, 10))
                .build()
            dispatchGesture(gesture, null, null)
        } ?: throw Exception("Screen size unavailable - service not initialized")
    }

    fun performSwipe(breakpoints: List<Pair<Float, Float>>) {
        screenSize?.let { size ->
            val path = Path()
            if (breakpoints.isEmpty()) return

            // MOVE TO FIRST POINT
            path.moveTo(breakpoints[0].first, breakpoints[0].second)

            // ADD ALL SUBSEQUENT POINTS
            for (i in 1 until breakpoints.size) {
                path.lineTo(breakpoints[i].first, breakpoints[i].second)
            }

            val gesture = GestureDescription.Builder()
                .addStroke(
                    GestureDescription.StrokeDescription(
                        path,
                        0,
                        // CALCULATE DURATION BASED ON DISTANCE
                        calculateSwipeDuration(breakpoints)
                    )
                )
                .build()

            dispatchGesture(gesture, null, null)
        } ?: throw Exception("Screen size unavailable - service not initialized")
    }

    // ADD DURATION CALCULATION HELPER
    private fun calculateSwipeDuration(points: List<Pair<Float, Float>>): Long {
        if (points.size < 2) return 300L
        var totalDistance = 0f
        for (i in 1 until points.size) {
            totalDistance += Math.hypot(
                (points[i].first - points[i-1].first).toDouble(),
                (points[i].second - points[i-1].second).toDouble()
            ).toFloat()
        }
        // 100ms PER 100PX + minimum 100ms
        return (totalDistance + 100).toLong()
    }

    fun typeText(text: String): Boolean {
        val node = rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: return false  // Return false if no focused input

        val arguments = Bundle().apply {
            putCharSequence(
                AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                text
            )
        }
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        screenSize = null  // Clean up on destroy
    }

    companion object {
        private var instance: AutomatorService? = null
        fun getInstance(): AutomatorService? = instance
    }
}

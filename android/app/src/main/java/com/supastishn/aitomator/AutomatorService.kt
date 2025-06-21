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
    var screenSize: Size? = null

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Handle accessibility events
    }

    override fun onInterrupt() {
        // Handle interruption
    }

    fun simulateTap(x: Float, y: Float) {
        val path = Path()
        path.moveTo(x, y)
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 10))
            .build()

        dispatchGesture(gesture, null, null)
    }

    fun performSwipe(breakpoints: List<Pair<Float, Float>>) {
        val path = Path()
        if (breakpoints.isEmpty()) return

        path.moveTo(breakpoints[0].first, breakpoints[0].second)
        for (i in 1 until breakpoints.size) {
            path.lineTo(breakpoints[i].first, breakpoints[i].second)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(
                GestureDescription.StrokeDescription(
                    path,
                    0,
                    breakpoints.size * 100L // Duration based on points
                )
            )
            .build()

        dispatchGesture(gesture, null, null)
    }

    fun typeText(text: String) {
        rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.let { node ->
            val arguments = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    text
                )
            }
            node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
        }
    }

    private val width: Int
        get() = resources.displayMetrics.widthPixels

    private val height: Int
        get() = resources.displayMetrics.heightPixels

    companion object {
        private var instance: AutomatorService? = null
        fun getInstance(): AutomatorService? = instance
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        screenSize = Size(width, height)
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }
}

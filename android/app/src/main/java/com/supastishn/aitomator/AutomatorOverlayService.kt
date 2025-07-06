package com.supastishn.aitomator

import android.app.Service
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.os.IBinder
import android.os.Build
import android.view.*
import android.graphics.PixelFormat
import android.view.Gravity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.core.app.NotificationCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager

class AutomatorOverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private lateinit var overlayView: View

    companion object {
        private const val OVERLAY_CHANNEL_ID = "automator_overlay_channel"
        private const val OVERLAY_NOTIFICATION_ID = 2
    }

    private val broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: android.content.Context, intent: Intent) {
            when (intent.action) {
                "automation.ACTION_UPDATE_STATUS" -> {
                    // Status is now shown in the notification, not the overlay.
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification: Notification = NotificationCompat.Builder(this, OVERLAY_CHANNEL_ID)
            .setContentTitle("AutoMate")
            .setContentText("Automation overlay is active.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(OVERLAY_NOTIFICATION_ID, notification)

        return START_NOT_STICKY
    }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                OVERLAY_CHANNEL_ID,
                "Automation Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        // Create overlay layout
        overlayView = LayoutInflater.from(this).inflate(R.layout.overlay_layout, null)

        // Set up layout parameters
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_SYSTEM_ALERT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 100 // Initial position
        }

        windowManager.addView(overlayView, params)

        // Handle click to stop automation
        overlayView.setOnClickListener {
            notifyAutomationStop()
        }

        // Add touch listener to make the overlay draggable
        overlayView.setOnTouchListener(object : View.OnTouchListener {
            private var initialX = 0
            private var initialY = 0
            private var initialTouchX = 0f
            private var initialTouchY = 0f

            override fun onTouch(v: View, event: MotionEvent): Boolean {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params.x
                        initialY = params.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params.x = initialX + (event.rawX - initialTouchX).toInt()
                        params.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager.updateViewLayout(overlayView, params)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        if (kotlin.math.abs(event.rawX - initialTouchX) < 5 && kotlin.math.abs(event.rawY - initialTouchY) < 5) {
                            v.performClick()
                        }
                        return true
                    }
                }
                return false
            }
        })

        // Register broadcast receiver for status updates
        val filter = IntentFilter().apply {
            addAction("automation.ACTION_UPDATE_STATUS")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(broadcastReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(broadcastReceiver, filter)
        }

        // REMOVED initial status logic from here.
    }

    private fun notifyAutomationStop() {
        // Send broadcast or use callback to notify main app
        val intent = Intent("automation.ACTION_STOP")
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::windowManager.isInitialized && ::overlayView.isInitialized) {
            windowManager.removeView(overlayView)
        }
        unregisterReceiver(broadcastReceiver)
    }
}

package com.supastishn.aitomator

import android.app.Service
import android.content.Intent
import android.content.IntentFilter
import android.content.BroadcastReceiver
import android.os.IBinder
import android.os.Build
import android.view.*
import android.widget.TextView
import android.widget.Button
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
    private lateinit var statusText: TextView
    private lateinit var stopButton: Button

    companion object {
        private const val OVERLAY_CHANNEL_ID = "automator_overlay_channel"
        private const val OVERLAY_NOTIFICATION_ID = 2
    }

    private val broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: android.content.Context, intent: Intent) {
            when (intent.action) {
                "automation.ACTION_UPDATE_STATUS" -> {
                    val status = intent.getStringExtra("status")
                    statusText.text = status ?: "Processing..."
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

        // Get status from the intent that started the service
        intent?.getStringExtra("status")?.let {
            statusText.text = it
        }
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
        statusText = overlayView.findViewById(R.id.statusText)
        stopButton = overlayView.findViewById(R.id.stopButton)

        // Set up layout parameters
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_SYSTEM_ALERT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP
        }

        windowManager.addView(overlayView, params)

        // Handle stop button click
        stopButton.setOnClickListener {
            notifyAutomationStop()
            // Do not stopSelf(); overlay lifecycle is now managed by UI layer
        }

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

    fun updateStatus(text: String) {
        statusText.text = text
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

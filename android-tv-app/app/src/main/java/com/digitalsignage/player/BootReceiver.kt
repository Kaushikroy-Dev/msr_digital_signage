package com.digitalsignage.player

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Broadcast receiver that launches the app when the device boots.
 * This enables auto-start functionality for digital signage displays.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            android.util.Log.d(TAG, "Boot completed - launching MainActivity")
            
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            
            try {
                context.startActivity(launchIntent)
                android.util.Log.d(TAG, "MainActivity launched successfully")
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Failed to launch MainActivity", e)
            }
        }
    }
    
    companion object {
        private const val TAG = "BootReceiver"
    }
}

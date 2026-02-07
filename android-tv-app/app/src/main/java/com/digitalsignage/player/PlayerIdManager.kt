package com.digitalsignage.player

import android.content.Context
import android.content.SharedPreferences
import java.util.UUID

/**
 * Manages player ID generation and storage for Android TV app.
 * Player ID is a unique identifier that persists across app restarts.
 */
class PlayerIdManager(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("player_prefs", Context.MODE_PRIVATE)
    private val PLAYER_ID_KEY = "player_id"
    
    /**
     * Get existing player ID or create a new one if it doesn't exist.
     * @return Player ID (UUID string)
     */
    fun getOrCreatePlayerId(): String {
        var playerId = prefs.getString(PLAYER_ID_KEY, null)
        if (playerId == null) {
            playerId = UUID.randomUUID().toString()
            prefs.edit().putString(PLAYER_ID_KEY, playerId).apply()
            android.util.Log.d(TAG, "Generated new player ID: $playerId")
        } else {
            android.util.Log.d(TAG, "Retrieved existing player ID: $playerId")
        }
        return playerId
    }
    
    /**
     * Get existing player ID without creating a new one.
     * @return Player ID if exists, null otherwise
     */
    fun getPlayerId(): String? {
        return prefs.getString(PLAYER_ID_KEY, null)
    }
    
    /**
     * Set a specific player ID (useful for testing or manual configuration).
     */
    fun setPlayerId(playerId: String) {
        prefs.edit().putString(PLAYER_ID_KEY, playerId).apply()
        android.util.Log.d(TAG, "Set player ID: $playerId")
    }
    
    /**
     * Clear the stored player ID.
     */
    fun clearPlayerId() {
        prefs.edit().remove(PLAYER_ID_KEY).apply()
        android.util.Log.d(TAG, "Cleared player ID")
    }
    
    companion object {
        private const val TAG = "PlayerIdManager"
    }
}

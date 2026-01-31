package com.digitalsignage.player;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable kiosk mode
        enableKioskMode();
        
        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        
        // Hide system UI for immersive mode
        hideSystemUI();
    }

    @Override
    public void onResume() {
        super.onResume();
        enableKioskMode();
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    /**
     * Enable kiosk mode (lock task mode)
     */
    private void enableKioskMode() {
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (am != null && am.isInLockTaskMode()) {
            // Already in lock task mode
            return;
        }
        
        // Start lock task mode (requires device owner or kiosk app)
        try {
            startLockTask();
        } catch (Exception e) {
            // Lock task mode may not be available
            // This requires device owner mode or kiosk app configuration
            android.util.Log.w(TAG, "Lock task mode not available: " + e.getMessage());
        }
    }

    /**
     * Hide system UI for immersive fullscreen
     */
    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
            | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }

    /**
     * Prevent back button from exiting app
     */
    @Override
    public void onBackPressed() {
        // Don't call super - prevent back navigation
        // In kiosk mode, back button should not exit
    }

    /**
     * Handle key events - prevent certain keys from exiting
     */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Prevent home button (if possible)
        if (keyCode == KeyEvent.KEYCODE_HOME) {
            return true;
        }
        
        // Prevent recent apps button
        if (keyCode == KeyEvent.KEYCODE_APP_SWITCH) {
            return true;
        }
        
        return super.onKeyDown(keyCode, event);
    }

    /**
     * Prevent app from being moved to background
     */
    @Override
    protected void onUserLeaveHint() {
        // Move app back to foreground
        moveTaskToBack(false);
    }
}

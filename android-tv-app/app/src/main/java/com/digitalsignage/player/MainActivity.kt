package com.digitalsignage.player

import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * Main activity for Android TV app.
 * Loads the web player in a WebView with the player_id appended to the URL.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var playerIdManager: PlayerIdManager
    
    // Production player URL - update this to match your frontend URL
    private val PLAYER_URL = "https://frontend-production-73c0.up.railway.app/player"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Get or create player ID
        playerIdManager = PlayerIdManager(this)
        val playerId = playerIdManager.getOrCreatePlayerId()
        
        android.util.Log.d(TAG, "Starting MainActivity with player ID: $playerId")
        
        // Setup WebView
        setupWebView()
        
        // Load player URL with player_id query parameter
        val url = "$PLAYER_URL?player_id=$playerId"
        android.util.Log.d(TAG, "Loading URL: $url")
        webView.loadUrl(url)
        
        // Keep screen on (important for digital signage)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Hide system UI for fullscreen experience
        hideSystemUI()
    }
    
    private fun setupWebView() {
        webView = WebView(this)
        setContentView(webView)
        
        val settings = webView.settings
        
        // Enable JavaScript (required for React app)
        settings.javaScriptEnabled = true
        
        // Enable DOM storage (for localStorage, sessionStorage)
        settings.domStorageEnabled = true
        
        // Allow media playback without user gesture (required for autoplay)
        settings.mediaPlaybackRequiresUserGesture = false
        
        // Enable file access (for loading local resources if needed)
        settings.allowFileAccess = true
        
        // Set cache mode (use default - will cache resources)
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        
        // Enable mixed content (if needed for HTTP resources on HTTPS page)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        // Set user agent (optional - can help identify Android TV app)
        settings.userAgentString = "${settings.userAgentString} DigitalSignageTV/1.0"
        
        // Configure WebView client
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                // Don't navigate away from player - keep everything in WebView
                val url = request?.url?.toString() ?: ""
                android.util.Log.d(TAG, "Navigation attempt: $url")
                
                // Only allow navigation within the same domain
                if (url.startsWith(PLAYER_URL) || url.contains("player_id=")) {
                    return false // Let WebView handle it
                }
                
                // Block external navigation
                android.util.Log.w(TAG, "Blocked external navigation: $url")
                return true // Block navigation
            }
            
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                android.util.Log.e(TAG, "WebView error: ${error?.description}")
                android.util.Log.e(TAG, "Error code: ${error?.errorCode}")
                android.util.Log.e(TAG, "Failed URL: ${request?.url}")
                
                // Optionally show error page or retry logic
                view?.loadUrl("javascript:console.error('Network error:', '${error?.description}')")
            }
            
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                android.util.Log.d(TAG, "Page finished loading: $url")
            }
        }
        
        // Handle JavaScript interface for Android callbacks (optional)
        webView.addJavascriptInterface(WebAppInterface(), "Android")
        
        android.util.Log.d(TAG, "WebView configured successfully")
    }
    
    private fun hideSystemUI() {
        // Hide navigation bar and status bar for immersive experience
        window.decorView.systemUiVisibility = (
            android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
            or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )
    }
    
    override fun onResume() {
        super.onResume()
        // Reload if WebView was destroyed
        if (::webView.isInitialized) {
            webView.onResume()
        }
    }
    
    override fun onPause() {
        super.onPause()
        if (::webView.isInitialized) {
            webView.onPause()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (::webView.isInitialized) {
            webView.destroy()
        }
    }
    
    override fun onBackPressed() {
        // Prevent back button from closing the app (kiosk mode)
        // Optionally, you can implement custom back navigation within WebView
        android.util.Log.d(TAG, "Back button pressed - ignored in kiosk mode")
        // Uncomment below if you want to allow back navigation within WebView
        // if (webView.canGoBack()) {
        //     webView.goBack()
        // } else {
        //     super.onBackPressed()
        // }
    }
    
    companion object {
        private const val TAG = "MainActivity"
    }
}

/**
 * JavaScript interface for Android callbacks.
 * Allows the web app to communicate with the native Android app.
 */
class WebAppInterface {
    @android.webkit.JavascriptInterface
    fun getPlayerId(): String {
        // This can be called from JavaScript: Android.getPlayerId()
        // For now, return empty string - player ID is passed via URL
        return ""
    }
    
    @android.webkit.JavascriptInterface
    fun log(message: String) {
        android.util.Log.d("WebApp", message)
    }
}

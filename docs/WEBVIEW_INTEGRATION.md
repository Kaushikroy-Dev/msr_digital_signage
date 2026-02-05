# WebView Integration Guide

This document describes how to integrate the Digital Signage web player with native Android and iOS apps using WebView.

## Overview

The web player communicates with native apps through JavaScript interfaces to:
1. Save device ID after successful registration
2. Retrieve device ID on app launch
3. Automatically redirect to the correct player URL

## JavaScript Interface

The web player expects the following JavaScript interfaces:

### Required Functions

- `saveDeviceId(deviceId: String)` - Called by web player to save device ID to native storage
- `getDeviceId(): String` - Called by web player to retrieve saved device ID

## Android Integration (Kotlin)

### 1. Add JavaScript Interface to WebView

```kotlin
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.content.SharedPreferences

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var sharedPreferences: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize SharedPreferences
        sharedPreferences = getSharedPreferences("DigitalSignage", MODE_PRIVATE)
        
        // Setup WebView
        webView = WebView(this)
        setupWebView()
        
        setContentView(webView)
    }
    
    private fun setupWebView() {
        val settings = webView.settings
        
        // Enable JavaScript (required)
        settings.javaScriptEnabled = true
        
        // Enable DOM storage
        settings.domStorageEnabled = true
        
        // Allow media playback without user gesture
        settings.mediaPlaybackRequiresUserGesture = false
        
        // Add JavaScript interface
        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun saveDeviceId(deviceId: String) {
                sharedPreferences.edit()
                    .putString("device_id", deviceId)
                    .apply()
                Log.d("DigitalSignage", "DeviceId saved: $deviceId")
            }
            
            @JavascriptInterface
            fun getDeviceId(): String {
                return sharedPreferences.getString("device_id", "") ?: ""
            }
        }, "Android")
        
        // Load initial URL
        loadInitialUrl()
    }
    
    private fun loadInitialUrl() {
        val deviceId = sharedPreferences.getString("device_id", null)
        val baseUrl = "https://frontend-production-73c0.up.railway.app"
        
        val url = if (deviceId != null && deviceId.isNotEmpty()) {
            "$baseUrl/player/$deviceId"
        } else {
            "$baseUrl/media"
        }
        
        webView.loadUrl(url)
    }
}
```

### 2. Handle Back Button (Optional)

```kotlin
override fun onBackPressed() {
    if (webView.canGoBack()) {
        webView.goBack()
    } else {
        super.onBackPressed()
    }
}
```

### 3. Required Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## iOS Integration (Swift)

### 1. Create WKWebView Configuration

```swift
import WebKit
import UIKit

class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        loadInitialUrl()
    }
    
    private func setupWebView() {
        let userContentController = WKUserContentController()
        
        // Add message handlers
        userContentController.add(self, name: "saveDeviceId")
        userContentController.add(self, name: "getDeviceId")
        
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = userContentController
        
        // Allow media playback without user gesture
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // Create WebView
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        view.addSubview(webView)
    }
    
    // Handle messages from JavaScript
    func userContentController(_ userContentController: WKUserContentController, 
                              didReceive message: WKScriptMessage) {
        switch message.name {
        case "saveDeviceId":
            if let deviceId = message.body as? String {
                UserDefaults.standard.set(deviceId, forKey: "device_id")
                print("DeviceId saved: \(deviceId)")
            }
            
        case "getDeviceId":
            // Return deviceId to JavaScript
            let deviceId = UserDefaults.standard.string(forKey: "device_id") ?? ""
            let script = "window.__nativeDeviceId = '\(deviceId)';"
            webView.evaluateJavaScript(script, completionHandler: nil)
            
        default:
            break
        }
    }
    
    private func loadInitialUrl() {
        let baseUrl = "https://frontend-production-73c0.up.railway.app"
        let deviceId = UserDefaults.standard.string(forKey: "device_id")
        
        let urlString: String
        if let deviceId = deviceId, !deviceId.isEmpty {
            urlString = "\(baseUrl)/player/\(deviceId)"
        } else {
            urlString = "\(baseUrl)/media"
        }
        
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
    }
}
```

### 2. Alternative: Using WKScriptMessageHandler with Callback

Since iOS WKWebView doesn't support synchronous return values from JavaScript, you can use a callback approach:

```swift
// In userContentController didReceive:
case "getDeviceId":
    let deviceId = UserDefaults.standard.string(forKey: "device_id") ?? ""
    // Inject deviceId into window object
    let script = """
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.getDeviceId) {
            window.__nativeDeviceId = '\(deviceId)';
        }
    """
    webView.evaluateJavaScript(script, completionHandler: nil)
```

Then in JavaScript (webViewUtils.js), check for `window.__nativeDeviceId`:

```javascript
export function getDeviceIdFromNative() {
    // Check for iOS injected deviceId
    if (window.__nativeDeviceId) {
        return window.__nativeDeviceId;
    }
    // ... rest of implementation
}
```

### 3. Required Info.plist Settings

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## App Launch Flow

### Recommended Flow

1. **App Launch**:
   - Check for saved `device_id` in native storage (SharedPreferences/UserDefaults)
   
2. **If device_id exists**:
   - Load: `https://frontend-production-73c0.up.railway.app/player/{deviceId}`
   - Player will automatically start playing content
   
3. **If device_id does NOT exist**:
   - Load: `https://frontend-production-73c0.up.railway.app/media`
   - Web player will check for deviceId and redirect to registration if needed
   - After successful registration, `saveDeviceId()` will be called
   - On next app launch, deviceId will be found and player will load directly

## Testing

### Android Testing

1. Install app on Android device/emulator
2. Launch app - should load `/media` route (no deviceId)
3. Complete device registration
4. Verify `saveDeviceId()` is called (check logs)
5. Close and restart app
6. Should automatically load `/player/{deviceId}`

### iOS Testing

1. Install app on iOS device/simulator
2. Launch app - should load `/media` route (no deviceId)
3. Complete device registration
4. Verify `saveDeviceId` message is received (check logs)
5. Close and restart app
6. Should automatically load `/player/{deviceId}`

## Troubleshooting

### Android Issues

**Issue**: `saveDeviceId()` not being called
- **Solution**: Ensure `@JavascriptInterface` annotation is present
- **Solution**: Verify JavaScript is enabled: `settings.javaScriptEnabled = true`
- **Solution**: Check WebView logs for JavaScript errors

**Issue**: `getDeviceId()` returns empty string
- **Solution**: Verify SharedPreferences key matches: `"device_id"`
- **Solution**: Check that `saveDeviceId()` was called successfully

### iOS Issues

**Issue**: Message handlers not receiving messages
- **Solution**: Verify `userContentController.add(self, name: "...")` is called before WebView loads
- **Solution**: Ensure `WKScriptMessageHandler` protocol is implemented

**Issue**: Cannot get deviceId synchronously
- **Solution**: Use callback approach with `evaluateJavaScript` to inject deviceId into `window.__nativeDeviceId`

## Security Considerations

1. **Validate deviceId format**: Ensure deviceId is a valid UUID before saving
2. **Sanitize input**: Validate deviceId before using in URL
3. **HTTPS only**: Always use HTTPS URLs in production
4. **Error handling**: Handle cases where JavaScript interface is unavailable

## Example: Complete Android Implementation

```kotlin
package com.digitalsignage.player

import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val prefsName = "DigitalSignage"
    private val deviceIdKey = "device_id"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        webView = WebView(this)
        setupWebView()
        setContentView(webView)
    }
    
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("DigitalSignage", "Page loaded: $url")
            }
        }
        
        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun saveDeviceId(deviceId: String) {
                if (isValidUUID(deviceId)) {
                    getSharedPreferences(prefsName, MODE_PRIVATE)
                        .edit()
                        .putString(deviceIdKey, deviceId)
                        .apply()
                    Log.d("DigitalSignage", "DeviceId saved: $deviceId")
                } else {
                    Log.e("DigitalSignage", "Invalid deviceId format: $deviceId")
                }
            }
            
            @JavascriptInterface
            fun getDeviceId(): String {
                return getSharedPreferences(prefsName, MODE_PRIVATE)
                    .getString(deviceIdKey, "") ?: ""
            }
        }, "Android")
        
        loadInitialUrl()
    }
    
    private fun loadInitialUrl() {
        val deviceId = getSharedPreferences(prefsName, MODE_PRIVATE)
            .getString(deviceIdKey, null)
        
        val baseUrl = "https://frontend-production-73c0.up.railway.app"
        val url = if (deviceId != null && deviceId.isNotEmpty()) {
            "$baseUrl/player/$deviceId"
        } else {
            "$baseUrl/media"
        }
        
        webView.loadUrl(url)
    }
    
    private fun isValidUUID(uuid: String): Boolean {
        val uuidRegex = Regex(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            RegexOption.IGNORE_CASE
        )
        return uuidRegex.matches(uuid)
    }
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```

## Support

For issues or questions, please refer to the main project documentation or contact the development team.

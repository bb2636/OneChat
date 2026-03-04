package com.onechat.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.Manifest;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "OneChat";
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1002;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1003;
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1004;

    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.addJavascriptInterface(new OneChatBridge(), "OneChatBridge");

        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        ua = ua.replace("; wv)", ")").replace(" Version/4.0", "");
        settings.setUserAgentString(ua + " OneChat-Android");
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.contains("accounts.google.com") ||
                    url.contains("googleapis.com") ||
                    url.contains("supabase.co/auth")) {
                    openInChrome(url);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });

        webView.postDelayed(() -> {
            Log.d(TAG, "Setting custom WebChromeClient (postDelayed)");
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                    Log.d(TAG, "onGeolocationPermissionsShowPrompt: " + origin);
                    if (hasLocationPermission()) {
                        Log.d(TAG, "Location already granted, invoking callback");
                        callback.invoke(origin, true, false);
                    } else {
                        Log.d(TAG, "Requesting location permission from system");
                        pendingGeolocationCallback = callback;
                        pendingGeolocationOrigin = origin;
                        ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            },
                            LOCATION_PERMISSION_REQUEST_CODE);
                    }
                }

                @Override
                public void onGeolocationPermissionsHidePrompt() {
                    Log.d(TAG, "onGeolocationPermissionsHidePrompt");
                }

                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    String[] resources = request.getResources();
                    List<String> granted = new ArrayList<>();

                    for (String resource : resources) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                granted.add(resource);
                            }
                        } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            granted.add(resource);
                        }
                    }

                    if (!granted.isEmpty()) {
                        request.grant(granted.toArray(new String[0]));
                    } else {
                        request.deny();
                    }
                }
            });
        }, 500);
    }

    private class OneChatBridge {
        @JavascriptInterface
        public void openAppSettings() {
            Log.d(TAG, "Bridge: openAppSettings called");
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }

        @JavascriptInterface
        public boolean hasLocationPermission() {
            boolean has = MainActivity.this.hasLocationPermission();
            Log.d(TAG, "Bridge: hasLocationPermission = " + has);
            return has;
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            Log.d(TAG, "Bridge: requestLocationPermission called");
            runOnUiThread(() -> {
                if (!ActivityCompat.shouldShowRequestPermissionRationale(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                    && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_DENIED) {
                    Log.d(TAG, "Permission permanently denied, opening settings");
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } else {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        LOCATION_PERMISSION_REQUEST_CODE);
                }
            });
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            Log.d(TAG, "Bridge: requestNotificationPermission called");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                runOnUiThread(() -> {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                        NOTIFICATION_PERMISSION_REQUEST_CODE);
                });
            } else {
                dispatchNotificationResult(true);
            }
        }

        @JavascriptInterface
        public boolean isPermissionPermanentlyDenied() {
            return !ActivityCompat.shouldShowRequestPermissionRationale(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_DENIED;
        }

        @JavascriptInterface
        public void debugInfo() {
            boolean hasLoc = hasLocationPermission();
            boolean permDenied = isPermissionPermanentlyDenied();
            Log.d(TAG, "DEBUG: hasLocation=" + hasLoc + ", permanentlyDenied=" + permDenied + ", SDK=" + Build.VERSION.SDK_INT);
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "console.log('[OneChatBridge] hasLocation=" + hasLoc + ", permanentlyDenied=" + permDenied + ", SDK=" + Build.VERSION.SDK_INT + "');",
                        null
                    );
                });
            }
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        Log.d(TAG, "onRequestPermissionsResult: code=" + requestCode);

        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            boolean locationGranted = hasLocationPermission();
            Log.d(TAG, "Location permission result: " + locationGranted);

            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, locationGranted, false);
                pendingGeolocationCallback = null;
                pendingGeolocationOrigin = null;
            }

            WebView webView = getBridge().getWebView();
            if (webView != null) {
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('onechat-location-result', {detail:{granted:" + locationGranted + "}}));",
                        null
                    );
                });
            }
        }

        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            boolean notifGranted = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                notifGranted = ContextCompat.checkSelfPermission(this,
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            dispatchNotificationResult(notifGranted);
        }
    }

    private void dispatchNotificationResult(boolean granted) {
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            runOnUiThread(() -> {
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('onechat-notification-result', {detail:{granted:" + granted + "}}));",
                    null
                );
            });
        }
    }

    private void openInChrome(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.setPackage("com.android.chrome");
        try {
            startActivity(intent);
        } catch (Exception e) {
            intent.setPackage(null);
            startActivity(intent);
        }
    }
}

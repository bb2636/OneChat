package com.onechat.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.Manifest;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "OneChat";

    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;

    private final ActivityResultLauncher<String[]> locationPermissionLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
            boolean granted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION))
                || Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION));

            Log.d(TAG, "locationPermissionLauncher callback: granted=" + granted + ", results=" + result);

            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
                Log.d(TAG, "Invoking pending geolocation callback with granted=" + granted);
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, granted, false);
                pendingGeolocationCallback = null;
                pendingGeolocationOrigin = null;
            }

            dispatchToWebView("onechat-location-result", granted);
        });

    private final ActivityResultLauncher<String> notificationPermissionLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            Log.d(TAG, "notificationPermissionLauncher callback: granted=" + granted);
            dispatchToWebView("onechat-notification-result", granted);
        });

    @Override
    protected void load() {
        super.load();

        Log.d(TAG, "load() called, bridge created, setting up WebView");

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            Log.e(TAG, "WebView is null after bridge creation!");
            return;
        }

        Log.d(TAG, "WebView obtained, configuring bridge and settings");

        webView.addJavascriptInterface(new OneChatBridge(), "OneChatBridge");

        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        Log.d(TAG, "Original UA: " + ua);
        ua = ua.replace("; wv)", ")").replace(" Version/4.0", "");
        settings.setUserAgentString(ua + " OneChat-Android");
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        Log.d(TAG, "New UA: " + settings.getUserAgentString());

        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Log.d(TAG, "onGeolocationPermissionsShowPrompt: " + origin);
                if (hasLocationPermission()) {
                    Log.d(TAG, "Location already granted, invoking callback directly");
                    callback.invoke(origin, true, false);
                } else {
                    Log.d(TAG, "Location not granted, launching permission request");
                    pendingGeolocationCallback = callback;
                    pendingGeolocationOrigin = origin;
                    locationPermissionLauncher.launch(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    });
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

        Log.d(TAG, "WebView setup complete");
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
                if (isPermissionPermanentlyDenied(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    Log.d(TAG, "Location permanently denied, opening app settings");
                    openAppSettings();
                } else {
                    Log.d(TAG, "Launching location permission request via ActivityResultLauncher");
                    locationPermissionLauncher.launch(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    });
                }
            });
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                boolean has = ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                Log.d(TAG, "Bridge: hasNotificationPermission = " + has + " (API " + Build.VERSION.SDK_INT + ")");
                return has;
            }
            Log.d(TAG, "Bridge: hasNotificationPermission = true (pre-TIRAMISU)");
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            Log.d(TAG, "Bridge: requestNotificationPermission called");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                runOnUiThread(() -> {
                    if (isPermissionPermanentlyDenied(Manifest.permission.POST_NOTIFICATIONS)) {
                        Log.d(TAG, "Notification permanently denied, opening app settings");
                        openAppSettings();
                    } else {
                        Log.d(TAG, "Launching notification permission request via ActivityResultLauncher");
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
                    }
                });
            } else {
                dispatchToWebView("onechat-notification-result", true);
            }
        }

        @JavascriptInterface
        public boolean isLocationPermanentlyDenied() {
            boolean denied = isPermissionPermanentlyDenied(Manifest.permission.ACCESS_FINE_LOCATION);
            Log.d(TAG, "Bridge: isLocationPermanentlyDenied = " + denied);
            return denied;
        }

        @JavascriptInterface
        public void debugInfo() {
            boolean hasLoc = MainActivity.this.hasLocationPermission();
            boolean locDenied = isPermissionPermanentlyDenied(Manifest.permission.ACCESS_FINE_LOCATION);
            boolean hasNotif = true;
            boolean notifDenied = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                hasNotif = ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                notifDenied = isPermissionPermanentlyDenied(Manifest.permission.POST_NOTIFICATIONS);
            }
            String info = "hasLocation=" + hasLoc
                + ", locPermanentlyDenied=" + locDenied
                + ", hasNotification=" + hasNotif
                + ", notifPermanentlyDenied=" + notifDenied
                + ", SDK=" + Build.VERSION.SDK_INT;
            Log.d(TAG, "DEBUG: " + info);

            WebView webView = getBridge().getWebView();
            if (webView != null) {
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "console.log('[OneChatBridge] " + info + "');"
                        + "window.dispatchEvent(new CustomEvent('onechat-debug', {detail:{" + info + "}}));",
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

    private boolean isPermissionPermanentlyDenied(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_DENIED
            && !shouldShowRequestPermissionRationale(permission);
    }

    private void dispatchToWebView(String eventName, boolean granted) {
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            Log.w(TAG, "dispatchToWebView: WebView is null, cannot dispatch " + eventName);
            return;
        }
        Log.d(TAG, "dispatchToWebView: " + eventName + " granted=" + granted);
        runOnUiThread(() -> {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('" + eventName + "', {detail:{granted:" + granted + "}}));",
                null
            );
        });
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

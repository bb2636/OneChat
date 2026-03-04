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

public class MainActivity extends BridgeActivity {

    private static final String TAG = "OneChat";
    private volatile boolean bridgeInjected = false;

    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;

    private final ActivityResultLauncher<String[]> locationPermissionLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
            boolean granted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION))
                || Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION));

            Log.d(TAG, "locationPermissionLauncher callback: granted=" + granted);

            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
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
        Log.d(TAG, "load() called — attempting WebView setup");
        try {
            setupWebView();
        } catch (Exception e) {
            Log.e(TAG, "Error in load() setupWebView: " + e.getMessage(), e);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (!bridgeInjected) {
            Log.d(TAG, "onStart() — bridge not yet injected, retrying setup");
            try {
                setupWebView();
            } catch (Exception e) {
                Log.e(TAG, "Error in onStart() setupWebView: " + e.getMessage(), e);
            }
        }
    }

    private void setupWebView() {
        if (bridgeInjected) {
            Log.d(TAG, "setupWebView: already injected, skipping");
            return;
        }

        if (getBridge() == null) {
            Log.e(TAG, "setupWebView: getBridge() is null!");
            return;
        }

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            Log.e(TAG, "setupWebView: WebView is null!");
            return;
        }

        Log.d(TAG, "setupWebView: injecting OneChatBridge and configuring WebView");

        webView.addJavascriptInterface(new OneChatBridge(), "OneChatBridge");

        WebSettings settings = webView.getSettings();
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        String currentUa = settings.getUserAgentString();
        Log.d(TAG, "Current UA: " + currentUa);
        if (currentUa != null && !currentUa.contains("OneChat-Android")) {
            String cleanUa = currentUa.replace("; wv)", ")").replace(" Version/4.0", "");
            settings.setUserAgentString(cleanUa + " OneChat-Android");
            Log.d(TAG, "UA updated to: " + settings.getUserAgentString());
        }

        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Log.d(TAG, "onGeolocationPermissionsShowPrompt: " + origin);
                if (hasLocationPermission()) {
                    Log.d(TAG, "Location already granted");
                    callback.invoke(origin, true, false);
                } else {
                    Log.d(TAG, "Requesting location permission");
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

        bridgeInjected = true;
        Log.d(TAG, "setupWebView: complete, bridgeInjected=true");
    }

    private class OneChatBridge {
        @JavascriptInterface
        public void openAppSettings() {
            Log.d(TAG, "Bridge: openAppSettings");
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }

        @JavascriptInterface
        public boolean hasLocationPermission() {
            boolean has = MainActivity.this.hasLocationPermission();
            Log.d(TAG, "Bridge: hasLocationPermission=" + has);
            return has;
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            Log.d(TAG, "Bridge: requestLocationPermission");
            runOnUiThread(() -> {
                if (isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    Log.d(TAG, "Location permanently denied → opening settings");
                    openAppSettingsInternal();
                } else {
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
                return ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            Log.d(TAG, "Bridge: requestNotificationPermission");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                runOnUiThread(() -> {
                    if (isPermDeniedForever(Manifest.permission.POST_NOTIFICATIONS)) {
                        Log.d(TAG, "Notification permanently denied → opening settings");
                        openAppSettingsInternal();
                    } else {
                        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
                    }
                });
            } else {
                dispatchToWebView("onechat-notification-result", true);
            }
        }

        @JavascriptInterface
        public boolean isLocationPermanentlyDenied() {
            return isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION);
        }

        @JavascriptInterface
        public String getDebugInfo() {
            boolean hasLoc = MainActivity.this.hasLocationPermission();
            boolean locDenied = isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION);
            boolean hasNotif = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                hasNotif = ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            }
            String info = "{\"hasLocation\":" + hasLoc
                + ",\"locPermanentlyDenied\":" + locDenied
                + ",\"hasNotification\":" + hasNotif
                + ",\"sdk\":" + Build.VERSION.SDK_INT
                + ",\"bridgeInjected\":" + bridgeInjected + "}";
            Log.d(TAG, "Bridge: getDebugInfo=" + info);
            return info;
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isPermDeniedForever(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_DENIED
            && !shouldShowRequestPermissionRationale(permission);
    }

    private void openAppSettingsInternal() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }

    private void dispatchToWebView(String eventName, boolean granted) {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        Log.d(TAG, "dispatchToWebView: " + eventName + "=" + granted);
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

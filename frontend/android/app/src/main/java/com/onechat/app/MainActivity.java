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
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
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
    private static final int LOC_REQ_CODE = 2001;
    private static final int NOTIF_REQ_CODE = 2002;

    private volatile boolean bridgeInjected = false;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    private ActivityResultLauncher<String[]> locLauncher;
    private ActivityResultLauncher<String> notifLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "=== MainActivity.onCreate START ===");

        try {
            locLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                    boolean granted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION))
                        || Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION));
                    Log.d(TAG, "locLauncher callback: granted=" + granted);
                    if (pendingGeoCallback != null) {
                        pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                        pendingGeoCallback = null;
                        pendingGeoOrigin = null;
                    }
                    dispatchEvent("onechat-location-result", granted);
                });

            notifLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(), granted -> {
                    Log.d(TAG, "notifLauncher callback: granted=" + granted);
                    dispatchEvent("onechat-notification-result", granted);
                });

            Log.d(TAG, "ActivityResultLaunchers registered OK");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register launchers: " + e.getMessage(), e);
        }

        super.onCreate(savedInstanceState);
        Log.d(TAG, "=== MainActivity.onCreate END ===");
    }

    @Override
    protected void load() {
        Log.d(TAG, "=== load() START ===");
        try {
            super.load();
            Log.d(TAG, "super.load() completed");
        } catch (Exception e) {
            Log.e(TAG, "super.load() failed: " + e.getMessage(), e);
            return;
        }

        try {
            injectBridge();
        } catch (Exception e) {
            Log.e(TAG, "injectBridge() in load() failed: " + e.getMessage(), e);
        }
        Log.d(TAG, "=== load() END ===");
    }

    @Override
    public void onStart() {
        super.onStart();
        if (!bridgeInjected) {
            Log.d(TAG, "onStart: bridge not injected, retrying");
            try {
                injectBridge();
            } catch (Exception e) {
                Log.e(TAG, "injectBridge() in onStart() failed: " + e.getMessage(), e);
            }
        }
    }

    private synchronized void injectBridge() {
        if (bridgeInjected) return;

        if (getBridge() == null) {
            Log.e(TAG, "injectBridge: getBridge() null");
            return;
        }
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            Log.e(TAG, "injectBridge: getWebView() null");
            return;
        }

        Log.d(TAG, "injectBridge: adding OneChatBridge interface");
        webView.addJavascriptInterface(new OneChatBridge(), "OneChatBridge");

        WebSettings settings = webView.getSettings();
        settings.setGeolocationEnabled(true);

        String ua = settings.getUserAgentString();
        Log.d(TAG, "injectBridge: current UA = " + ua);
        if (ua != null && !ua.contains("OneChat-Android")) {
            settings.setUserAgentString(ua + " OneChat-Android");
            Log.d(TAG, "injectBridge: UA updated");
        }

        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Log.d(TAG, "GeoPrompt: origin=" + origin);
                if (hasLocPerm()) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    requestLocPerm();
                }
            }

            @Override
            public void onGeolocationPermissionsHidePrompt() {}

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] resources = request.getResources();
                List<String> granted = new ArrayList<>();
                for (String r : resources) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
                            granted.add(r);
                    } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                        granted.add(r);
                    }
                }
                if (!granted.isEmpty()) request.grant(granted.toArray(new String[0]));
                else request.deny();
            }
        });

        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.contains("accounts.google.com") || url.contains("googleapis.com") || url.contains("supabase.co/auth")) {
                    openExternal(url);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });

        bridgeInjected = true;
        Log.d(TAG, "injectBridge: COMPLETE");
    }

    private void requestLocPerm() {
        if (locLauncher != null) {
            Log.d(TAG, "Using ActivityResultLauncher for location");
            locLauncher.launch(new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            });
        } else {
            Log.d(TAG, "Fallback: ActivityCompat.requestPermissions for location");
            ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                LOC_REQ_CODE);
        }
    }

    private void requestNotifPerm() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            dispatchEvent("onechat-notification-result", true);
            return;
        }
        if (notifLauncher != null) {
            Log.d(TAG, "Using ActivityResultLauncher for notification");
            notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
        } else {
            Log.d(TAG, "Fallback: ActivityCompat.requestPermissions for notification");
            ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                NOTIF_REQ_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        Log.d(TAG, "onRequestPermissionsResult: code=" + requestCode);

        if (requestCode == LOC_REQ_CODE) {
            boolean granted = hasLocPerm();
            Log.d(TAG, "Location fallback result: " + granted);
            if (pendingGeoCallback != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
            dispatchEvent("onechat-location-result", granted);
        }
        if (requestCode == NOTIF_REQ_CODE) {
            boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            dispatchEvent("onechat-notification-result", granted);
        }
    }

    private class OneChatBridge {
        @JavascriptInterface
        public void openAppSettings() {
            Log.d(TAG, "JS: openAppSettings");
            openSettings();
        }

        @JavascriptInterface
        public boolean hasLocationPermission() {
            return hasLocPerm();
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            Log.d(TAG, "JS: requestLocationPermission");
            runOnUiThread(() -> {
                if (isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    openSettings();
                } else {
                    requestLocPerm();
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
            Log.d(TAG, "JS: requestNotificationPermission");
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    isPermDeniedForever(Manifest.permission.POST_NOTIFICATIONS)) {
                    openSettings();
                } else {
                    requestNotifPerm();
                }
            });
        }

        @JavascriptInterface
        public boolean isLocationPermanentlyDenied() {
            return isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION);
        }

        @JavascriptInterface
        public String getDebugInfo() {
            return "{\"hasLoc\":" + hasLocPerm()
                + ",\"locDeniedForever\":" + isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION)
                + ",\"hasNotif\":" + (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
                + ",\"sdk\":" + Build.VERSION.SDK_INT
                + ",\"injected\":" + bridgeInjected
                + ",\"locLauncher\":" + (locLauncher != null)
                + ",\"notifLauncher\":" + (notifLauncher != null) + "}";
        }
    }

    private boolean hasLocPerm() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isPermDeniedForever(String perm) {
        return ContextCompat.checkSelfPermission(this, perm) == PackageManager.PERMISSION_DENIED
            && !shouldShowRequestPermissionRationale(perm);
    }

    private void openSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }

    private void dispatchEvent(String name, boolean granted) {
        if (getBridge() == null) return;
        WebView wv = getBridge().getWebView();
        if (wv == null) return;
        Log.d(TAG, "dispatch: " + name + "=" + granted);
        runOnUiThread(() -> wv.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('" + name + "',{detail:{granted:" + granted + "}}));", null));
    }

    private void openExternal(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.setPackage("com.android.chrome");
        try { startActivity(intent); }
        catch (Exception e) { intent.setPackage(null); startActivity(intent); }
    }
}

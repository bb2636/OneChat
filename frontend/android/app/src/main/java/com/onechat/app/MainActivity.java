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
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1002;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1003;

    private GeolocationPermissions.Callback pendingGeolocationCallback;
    private String pendingGeolocationOrigin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestStartupPermissions();
    }

    @Override
    public void onStart() {
        super.onStart();

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            Log.e(TAG, "WebView is null");
            return;
        }

        webView.addJavascriptInterface(new OneChatBridge(), "OneChatBridge");

        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        if (!ua.contains("OneChat-Android")) {
            ua = ua.replace("; wv)", ")").replace(" Version/4.0", "");
            settings.setUserAgentString(ua + " OneChat-Android");
        }
        settings.setGeolocationEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                } else {
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
    }

    private class OneChatBridge {
        @JavascriptInterface
        public void openAppSettings() {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }

        @JavascriptInterface
        public boolean hasLocationPermission() {
            return MainActivity.this.hasLocationPermission();
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            runOnUiThread(() -> {
                ActivityCompat.requestPermissions(MainActivity.this,
                    new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    LOCATION_PERMISSION_REQUEST_CODE);
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
        public boolean canRequestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return ActivityCompat.shouldShowRequestPermissionRationale(
                    MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                    || ContextCompat.checkSelfPermission(MainActivity.this,
                        Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_DENIED
                    || !hasRequestedNotification;
            }
            return true;
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                hasRequestedNotification = true;
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
        public int getAndroidVersion() {
            return Build.VERSION.SDK_INT;
        }
    }

    private boolean hasRequestedNotification = false;

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestStartupPermissions() {
        List<String> needed = new ArrayList<>();
        needed.add(Manifest.permission.ACCESS_FINE_LOCATION);
        needed.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        needed.add(Manifest.permission.CAMERA);

        List<String> toRequest = new ArrayList<>();
        for (String perm : needed) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(perm);
            }
        }

        if (!toRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, toRequest.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE || requestCode == PERMISSION_REQUEST_CODE) {
            if (pendingGeolocationCallback != null && pendingGeolocationOrigin != null) {
                boolean locationGranted = hasLocationPermission();
                pendingGeolocationCallback.invoke(pendingGeolocationOrigin, locationGranted, false);
                pendingGeolocationCallback = null;
                pendingGeolocationOrigin = null;
            }

            WebView webView = getBridge().getWebView();
            if (webView != null) {
                boolean locGranted = hasLocationPermission();
                runOnUiThread(() -> {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('onechat-location-result', {detail:{granted:" + locGranted + "}}));",
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

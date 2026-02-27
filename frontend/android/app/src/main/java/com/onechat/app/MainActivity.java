package com.onechat.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.util.List;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();

        WebView webView = getBridge().getWebView();

        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        ua = ua.replace("; wv)", ")").replace(" Version/4.0", "");
        settings.setUserAgentString(ua);

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

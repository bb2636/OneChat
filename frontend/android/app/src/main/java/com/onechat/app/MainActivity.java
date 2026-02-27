package com.onechat.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        String userAgent = settings.getUserAgentString();
        userAgent = userAgent.replace("; wv)", ")");
        userAgent = userAgent.replace(" Version/4.0", "");
        settings.setUserAgentString(userAgent);
    }
}

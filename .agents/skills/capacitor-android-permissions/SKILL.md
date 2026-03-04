---
name: capacitor-android-permissions
description: Capacitor Android WebView 앱에서 위치, 알림 등 네이티브 권한을 처리하는 방법. WebView에서 권한 요청이 안 되거나 Bridge가 동작하지 않을 때, 또는 새 Capacitor 프로젝트에 권한 시스템을 추가할 때 사용.
---

# Capacitor Android 권한 설정 가이드

Capacitor WebView 앱에서 네이티브 권한(위치, 알림, 카메라 등)을 처리하는 전체 구현 가이드.

## 아키텍처 개요

```
[웹 페이지 JS] ←→ [window.OneChatBridge] ←→ [MainActivity.java] ←→ [Android 시스템 권한]
                   (addJavascriptInterface)     (ActivityResultLauncher)
```

- **웹 → 네이티브**: `window.OneChatBridge.requestLocationPermission()` 호출
- **네이티브 → 웹**: `window.dispatchEvent(new CustomEvent('onechat-location-result', {detail: {granted: true}}))` 전달
- **네이티브 앱 감지**: User-Agent에 `OneChat-Android` 포함 여부로 판별

## 핵심 파일 3개

### 1. AndroidManifest.xml — 권한 선언

경로: `frontend/android/app/src/main/AndroidManifest.xml`

```xml
<!-- 위치 -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- 알림 (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- 카메라/갤러리 -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

<!-- 하드웨어 기능 (필수 아님으로 표시) -->
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### 2. MainActivity.java — 네이티브 권한 처리

경로: `frontend/android/app/src/main/java/com/onechat/app/MainActivity.java`

핵심 패턴:

```java
public class MainActivity extends BridgeActivity {

    // 1) ActivityResultLauncher는 반드시 onCreate()에서 super.onCreate() 전에 등록
    private ActivityResultLauncher<String[]> locLauncher;
    private ActivityResultLauncher<String> notifLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ★ 반드시 super.onCreate() 전에 등록
        locLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean granted = Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_FINE_LOCATION))
                    || Boolean.TRUE.equals(result.get(Manifest.permission.ACCESS_COARSE_LOCATION));
                // WebView로 결과 전달
                dispatchEvent("onechat-location-result", granted);
            });

        notifLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(), granted -> {
                dispatchEvent("onechat-notification-result", granted);
            });

        super.onCreate(savedInstanceState);
    }

    // 2) load()에서 Bridge 인젝션 — BridgeActivity의 loadWebView() 이후 호출됨
    @Override
    protected void load() {
        super.load();
        injectBridge();
    }

    // 3) Bridge 인젝션: JS 인터페이스 + WebChromeClient + WebViewClient 설정
    private synchronized void injectBridge() {
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new OneChatBridge(), "OneChatBridge");

        // WebChromeClient에서 위치 권한 프롬프트 처리
        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocPerm()) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    requestLocPerm();
                }
            }
        });

        // Google OAuth 등 외부 URL은 Chrome으로 열기
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.contains("accounts.google.com") || url.contains("supabase.co/auth")) {
                    openExternal(url);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    // 4) JS Bridge 클래스 — @JavascriptInterface 메서드들
    private class OneChatBridge {
        @JavascriptInterface
        public boolean hasLocationPermission() { return hasLocPerm(); }

        @JavascriptInterface
        public void requestLocationPermission() {
            runOnUiThread(() -> {
                if (isPermDeniedForever(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    openSettings(); // 영구 거부 시 앱 설정으로 이동
                } else {
                    requestLocPerm();
                }
            });
        }

        @JavascriptInterface
        public void openAppSettings() { openSettings(); }
    }

    // 5) 이벤트 디스패치 — Java → WebView JS
    private void dispatchEvent(String name, boolean granted) {
        WebView wv = getBridge().getWebView();
        runOnUiThread(() -> wv.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('" + name + "',{detail:{granted:" + granted + "}}));", null));
    }
}
```

### 3. capacitor.config.ts — Capacitor 설정

경로: `frontend/capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: 'com.onechat.app',
  appName: 'OneChat',
  webDir: 'out',
  appendUserAgent: 'OneChat-Android',  // ★ 네이티브 앱 감지용 UA
  server: {
    url: 'https://weoncaes.replit.app',  // 원격 서버 URL (WebView 모드)
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    appendUserAgent: 'OneChat-Android'  // android 섹션에도 동일하게
  },
  plugins: {
    Geolocation: {
      permissions: ['location']
    }
  }
};
```

## 웹 프론트엔드 사용법

### 네이티브 앱 감지

```typescript
const isNativeApp = /OneChat-Android/i.test(navigator.userAgent);
```

### Bridge 호출 (위치 권한 요청)

```typescript
const bridge = (window as any).OneChatBridge;

if (bridge?.requestLocationPermission) {
  bridge.requestLocationPermission();
} else {
  // 웹 브라우저 폴백
  navigator.geolocation.getCurrentPosition(successCb, errorCb);
}
```

### 이벤트 수신 (권한 결과)

```typescript
window.addEventListener("onechat-location-result", (e: Event) => {
  const granted = (e as CustomEvent).detail?.granted;
  if (granted) {
    navigator.geolocation.getCurrentPosition(successCb, errorCb);
  }
});

window.addEventListener("onechat-notification-result", (e: Event) => {
  const granted = (e as CustomEvent).detail?.granted;
  // 알림 구독 처리
});
```

### 영구 거부 → 설정 열기

```typescript
if (bridge?.isLocationPermanentlyDenied?.()) {
  // "설정에서 직접 권한을 허용해주세요" UI 표시
  bridge.openAppSettings();
}
```

## 주의사항 및 트러블슈팅

### ActivityResultLauncher 등록 순서
- `registerForActivityResult()`는 반드시 `super.onCreate()` **전에** 호출
- `super.onCreate()` 후에 등록하면 `IllegalStateException` 발생

### BridgeWebChromeClient 덮어쓰기
- Capacitor Bridge는 `loadWebView()`에서 자체 `BridgeWebChromeClient`를 설정
- `load()` 메서드에서 `super.load()` 호출 후 다시 `setWebChromeClient()`로 교체해야 `onGeolocationPermissionsShowPrompt`가 동작

### WebView 캐시 문제
- remote URL 모드에서 WebView가 이전 페이지를 캐싱할 수 있음
- Next.js `next.config.mjs`에 `Cache-Control: no-store` 헤더 추가로 해결
- APK 재설치 시 앱 삭제 후 다시 설치 (앱 데이터 초기화)

### appendUserAgent가 적용 안 될 때
- `capacitor.config.ts`와 `capacitor.config.json` 모두에 설정 필요
- `npx cap sync android` 실행 시 `.json`이 재생성됨 — `.ts`에 설정해야 영구 적용
- 안전하게 `injectBridge()`에서 UA를 직접 추가하는 코드도 병행

### 빌드 순서

```bash
cd frontend
npx cap sync android         # capacitor.config.ts → .json 동기화 + 웹 에셋 복사
cd android
./gradlew clean               # 이전 빌드 캐시 제거
./gradlew assembleDebug       # APK 생성
# 결과: app/build/outputs/apk/debug/OneChat-{version}.apk
```

### 버전 관리
- `frontend/android/app/build.gradle`에서 `versionCode` / `versionName` 변경
- 새 APK 확인 시 파일명으로 버전 구분 가능 (`OneChat-1.1.apk` 등)

## Bridge 메서드 전체 목록

| 메서드 | 반환 | 설명 |
|--------|------|------|
| `hasLocationPermission()` | boolean | 위치 권한 보유 여부 |
| `requestLocationPermission()` | void | 위치 권한 요청 (영구 거부 시 설정 열기) |
| `isLocationPermanentlyDenied()` | boolean | 위치 권한 영구 거부 여부 |
| `hasNotificationPermission()` | boolean | 알림 권한 보유 여부 |
| `requestNotificationPermission()` | void | 알림 권한 요청 |
| `openAppSettings()` | void | 앱 설정 화면 열기 |
| `getDebugInfo()` | string (JSON) | 디버그 정보 반환 |

## 이벤트 전체 목록

| 이벤트명 | detail | 발생 시점 |
|----------|--------|-----------|
| `onechat-location-result` | `{granted: boolean}` | 위치 권한 요청 결과 |
| `onechat-notification-result` | `{granted: boolean}` | 알림 권한 요청 결과 |

## 새 권한 추가 체크리스트

1. `AndroidManifest.xml`에 `<uses-permission>` 추가
2. `MainActivity.java`에 `ActivityResultLauncher` 등록 (`onCreate`에서)
3. `OneChatBridge` 클래스에 `@JavascriptInterface` 메서드 추가
4. `dispatchEvent()`로 결과를 WebView에 전달
5. 프론트엔드에서 Bridge 호출 + 이벤트 리스너 등록

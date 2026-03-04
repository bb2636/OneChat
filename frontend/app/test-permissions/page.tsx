"use client";

import { useState, useEffect, useCallback } from "react";

export default function TestPermissions() {
  const [logs, setLogs] = useState<string[]>([]);
  const [ua, setUa] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState<{isNative: boolean; hasBridge: boolean}>({isNative: false, hasBridge: false});

  const log = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  }, []);

  const getBridge = () => typeof window !== "undefined" ? (window as any).OneChatBridge : null;

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setUa(userAgent);

    const checkInterval = setInterval(() => {
      const bridge = getBridge();
      const isNative = /OneChat-Android/i.test(navigator.userAgent);
      setBridgeStatus({isNative, hasBridge: !!bridge});
      if (bridge) {
        clearInterval(checkInterval);
      }
    }, 500);

    setTimeout(() => clearInterval(checkInterval), 10000);
    return () => clearInterval(checkInterval);
  }, []);

  const checkBridge = () => {
    const bridge = getBridge();
    if (bridge) {
      log("Bridge 존재함 ✓");
      try {
        if (bridge.hasLocationPermission) log("  hasLocationPermission: " + bridge.hasLocationPermission());
        if (bridge.hasNotificationPermission) log("  hasNotificationPermission: " + bridge.hasNotificationPermission());
        if (bridge.isLocationPermanentlyDenied) log("  isLocationPermanentlyDenied: " + bridge.isLocationPermanentlyDenied());
        if (bridge.getDebugInfo) {
          const info = bridge.getDebugInfo();
          log("  debugInfo: " + info);
        }
      } catch (e: any) {
        log("  Bridge 메서드 호출 에러: " + e.message);
      }
    } else {
      log("Bridge 없음 (window.OneChatBridge = " + typeof (window as any).OneChatBridge + ")");
      log("  window 객체 키 중 'bridge' 포함: " +
        Object.keys(window).filter(k => k.toLowerCase().includes('bridge')).join(', ') || '없음');
    }
  };

  const testLocationBridge = () => {
    const bridge = getBridge();
    if (bridge?.requestLocationPermission) {
      log("bridge.requestLocationPermission() 호출...");
      bridge.requestLocationPermission();
    } else {
      log("bridge.requestLocationPermission 없음 — Navigator 폴백 시도");
      testLocationNavigator();
    }
  };

  const testLocationNavigator = () => {
    log("navigator.geolocation.getCurrentPosition() 호출...");
    if (!navigator.geolocation) {
      log("navigator.geolocation 지원 안됨");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        log("위치 성공: " + pos.coords.latitude.toFixed(6) + ", " + pos.coords.longitude.toFixed(6));
      },
      (err) => {
        log("위치 실패: code=" + err.code + " msg=" + err.message);
        if (err.code === 1) log("  → 사용자가 거부했거나 WebView 권한 미설정");
        if (err.code === 2) log("  → 위치를 사용할 수 없음");
        if (err.code === 3) log("  → 타임아웃");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const testNotificationBridge = () => {
    const bridge = getBridge();
    if (bridge?.requestNotificationPermission) {
      log("bridge.requestNotificationPermission() 호출...");
      bridge.requestNotificationPermission();
    } else {
      log("bridge.requestNotificationPermission 없음");
    }
  };

  const testOpenSettings = () => {
    const bridge = getBridge();
    if (bridge?.openAppSettings) {
      log("bridge.openAppSettings() 호출...");
      bridge.openAppSettings();
    } else {
      log("bridge.openAppSettings 없음");
    }
  };

  useEffect(() => {
    const handleLocResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      log("이벤트 수신: onechat-location-result, granted=" + detail?.granted);
    };
    const handleNotifResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      log("이벤트 수신: onechat-notification-result, granted=" + detail?.granted);
    };
    window.addEventListener("onechat-location-result", handleLocResult);
    window.addEventListener("onechat-notification-result", handleNotifResult);
    return () => {
      window.removeEventListener("onechat-location-result", handleLocResult);
      window.removeEventListener("onechat-notification-result", handleNotifResult);
    };
  }, [log]);

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 13, background: "#111", color: "#0f0", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>권한 테스트 v3</h2>
      <div style={{ marginBottom: 8, color: "#aaa", fontSize: 11, wordBreak: "break-all" }}>
        UA: {ua}
      </div>
      <div style={{ marginBottom: 8, color: bridgeStatus.hasBridge ? "#0f0" : "#f00", fontWeight: "bold" }}>
        isNativeApp: {String(bridgeStatus.isNative)} | Bridge: {bridgeStatus.hasBridge ? "있음 ✓" : "없음 ✗"}
      </div>
      <div style={{ marginBottom: 12, color: "#888", fontSize: 11 }}>
        Bridge를 500ms마다 재확인 중 (최대 10초)
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button onClick={checkBridge} style={btnStyle}>Bridge 확인</button>
        <button onClick={testLocationBridge} style={btnStyle}>위치(Bridge)</button>
        <button onClick={testLocationNavigator} style={{...btnStyle, background: "#059669"}}>위치(Navigator)</button>
        <button onClick={testNotificationBridge} style={btnStyle}>알림(Bridge)</button>
        <button onClick={testOpenSettings} style={{...btnStyle, background: "#d97706"}}>설정 열기</button>
        <button onClick={() => setLogs([])} style={{ ...btnStyle, background: "#333" }}>로그 지우기</button>
      </div>

      <div style={{ background: "#000", padding: 12, borderRadius: 8, maxHeight: "60vh", overflow: "auto" }}>
        {logs.length === 0 && <div style={{ color: "#555" }}>버튼을 눌러 테스트하세요</div>}
        {logs.map((l, i) => (
          <div key={i} style={{ marginBottom: 4, borderBottom: "1px solid #222", paddingBottom: 4 }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
};

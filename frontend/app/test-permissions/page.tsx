"use client";

import { useState, useEffect } from "react";

export default function TestPermissions() {
  const [logs, setLogs] = useState<string[]>([]);
  const [ua, setUa] = useState("");

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setUa(userAgent);
  }, []);

  const isNativeApp = typeof navigator !== "undefined" && /OneChat-Android/i.test(navigator.userAgent);
  const bridge = typeof window !== "undefined" ? (window as any).OneChatBridge : null;

  const checkBridge = () => {
    if (bridge) {
      log("Bridge 존재함");
      if (bridge.hasLocationPermission) log("  - hasLocationPermission: " + bridge.hasLocationPermission());
      if (bridge.hasNotificationPermission) log("  - hasNotificationPermission: " + bridge.hasNotificationPermission());
      if (bridge.isPermissionPermanentlyDenied) log("  - isPermissionPermanentlyDenied: " + bridge.isPermissionPermanentlyDenied());
      if (bridge.debugInfo) bridge.debugInfo();
    } else {
      log("Bridge 없음 (window.OneChatBridge = undefined)");
    }
  };

  const testLocationBridge = () => {
    if (bridge?.requestLocationPermission) {
      log("bridge.requestLocationPermission() 호출...");
      bridge.requestLocationPermission();
    } else {
      log("bridge.requestLocationPermission 없음");
    }
  };

  const testLocationNavigator = () => {
    log("navigator.geolocation.getCurrentPosition() 호출...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        log("위치 성공: " + pos.coords.latitude + ", " + pos.coords.longitude);
      },
      (err) => {
        log("위치 실패: code=" + err.code + " msg=" + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const testNotificationBridge = () => {
    if (bridge?.requestNotificationPermission) {
      log("bridge.requestNotificationPermission() 호출...");
      bridge.requestNotificationPermission();
    } else {
      log("bridge.requestNotificationPermission 없음");
    }
  };

  const testOpenSettings = () => {
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
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 14, background: "#111", color: "#0f0", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>권한 테스트</h2>
      <div style={{ marginBottom: 12, color: "#aaa", fontSize: 12, wordBreak: "break-all" }}>
        UA: {ua}
      </div>
      <div style={{ marginBottom: 12, color: "#ff0" }}>
        isNativeApp: {String(isNativeApp)} | Bridge: {bridge ? "있음" : "없음"}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button onClick={checkBridge} style={btnStyle}>Bridge 확인</button>
        <button onClick={testLocationBridge} style={btnStyle}>위치(Bridge)</button>
        <button onClick={testLocationNavigator} style={btnStyle}>위치(Navigator)</button>
        <button onClick={testNotificationBridge} style={btnStyle}>알림(Bridge)</button>
        <button onClick={testOpenSettings} style={btnStyle}>설정 열기</button>
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

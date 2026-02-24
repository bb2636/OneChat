"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { supabase, type SupabaseUser } from "@/lib/supabase";

interface NaverMapProps {
  className?: string;
  onMapLoad?: (map: naver.maps.Map) => void;
  userId?: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface OtherUserMarker {
  marker: naver.maps.Marker;
  circle?: naver.maps.Circle;
  userData: SupabaseUser;
  infoWindow?: any;
}

const LOCATION_UPDATE_THROTTLE_MS = 10_000;
const USER_RADIUS_METERS = 10;
const PROXIMITY_METERS = 10;
const MAX_SYNC_ACCURACY_METERS = 120;
const MAX_UI_ACCURACY_METERS = 300;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function getDistanceMeters(from: UserLocation, to: UserLocation) {
  const earthRadius = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function createMyMarkerContent() {
  return `
    <div style="
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 3px solid white;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
        <path d="M12 14C7.58172 14 4 16.6863 4 20V22H20V20C20 16.6863 16.4183 14 12 14Z" fill="white"/>
      </svg>
    </div>
  `;
}

function createOtherMarkerContent(userData: SupabaseUser) {
  const avatarUrl = userData.avatar_url || "";
  const hasAvatar = avatarUrl.trim() !== "";

  if (hasAvatar) {
    return `
      <div style="
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-image: url('${avatarUrl}');
        background-size: cover;
        background-position: center;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      "></div>
    `;
  }

  return `
    <div style="
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 3px solid white;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
        <path d="M12 14C7.58172 14 4 16.6863 4 20V22H20V20C20 16.6863 16.4183 14 12 14Z" fill="white"/>
      </svg>
    </div>
  `;
}

function createProximityInfoContent(userData: SupabaseUser) {
  const nickname = userData.nickname || "사용자";

  return `
    <div style="
      min-width: 170px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    ">
      <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #111827;">${nickname}</div>
      <div style="display: flex; gap: 6px;">
        <button data-map-action="chat" data-user-id="${userData.id}" style="
          flex: 1;
          border: 0;
          border-radius: 8px;
          background: #3b82f6;
          color: white;
          height: 32px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        ">채팅하기</button>
        <button data-map-action="friend" data-user-id="${userData.id}" style="
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          color: #111827;
          height: 32px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        ">친구추가</button>
      </div>
    </div>
  `;
}

export function NaverMap({ className = "", onMapLoad, userId }: NaverMapProps) {
  const router = useRouter();
  const mapRef = useRef<naver.maps.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<naver.maps.Marker | null>(null);
  const circleRef = useRef<naver.maps.Circle | null>(null);
  const pulseOverlayRef = useRef<naver.maps.OverlayView | null>(null);
  const otherUsersMarkersRef = useRef<Map<string, OtherUserMarker>>(new Map());
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const currentLocationRef = useRef<UserLocation | null>(null);
  const currentAccuracyRef = useRef<number | null>(null);
  const lastSentLocationRef = useRef<UserLocation | null>(null);
  const lastSyncAtRef = useRef<number>(0);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomTargetUser, setRoomTargetUser] = useState<SupabaseUser | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [memberLimit, setMemberLimit] = useState(2);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [authQueryKey, setAuthQueryKey] = useState<"ncpKeyId" | "ncpClientId">("ncpKeyId");
  const scriptBusterRef = useRef(
    process.env.NODE_ENV === "development" ? `&_ts=${Date.now()}` : ""
  );

  const safeSetMapNull = (target: { setMap: (map: any) => void } | null | undefined) => {
    if (!target) return;
    try {
      target.setMap(null);
    } catch {
      // Hot reload/unmount 타이밍에서 SDK 객체가 먼저 정리될 수 있어 예외를 무시합니다.
    }
  };

  const safeRevokeObjectUrl = (value: string | null) => {
    if (!value || !value.startsWith("blob:")) return;
    URL.revokeObjectURL(value);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).naver?.maps) {
      setIsScriptLoaded(true);
    }
  }, []);

  const removeOtherUserMarker = useCallback((targetUserId: string) => {
    const existing = otherUsersMarkersRef.current.get(targetUserId);
    if (!existing) return;

    existing.infoWindow?.close();
    existing.marker.setMap(null);
    existing.circle?.setMap(null);
    otherUsersMarkersRef.current.delete(targetUserId);
  }, []);

  const syncInfoWindowByDistance = useCallback((entry: OtherUserMarker, naverObj: any, map: naver.maps.Map) => {
    const myLocation = currentLocationRef.current;
    const lat = entry.userData.latitude;
    const lng = entry.userData.longitude;

    if (!myLocation || lat == null || lng == null) {
      entry.infoWindow?.close();
      entry.infoWindow = undefined;
      return;
    }

    const distance = getDistanceMeters(myLocation, { latitude: lat, longitude: lng });

    if (distance <= PROXIMITY_METERS) {
      if (!entry.infoWindow) {
        entry.infoWindow = new (naverObj.maps as any).InfoWindow({
          content: createProximityInfoContent(entry.userData),
          borderWidth: 0,
          disableAnchor: true,
          backgroundColor: "transparent",
          pixelOffset: new naverObj.maps.Point(0, -62),
        });
      }
      entry.infoWindow.open(map, entry.marker);
      return;
    }

    entry.infoWindow?.close();
  }, []);

  const createOrUpdateOtherUserMarker = useCallback((userData: SupabaseUser, naverObj: any, map: naver.maps.Map) => {
    if (userData.latitude == null || userData.longitude == null) return;

    const existing = otherUsersMarkersRef.current.get(userData.id);
    if (existing) {
      existing.infoWindow?.close();
      existing.marker.setMap(null);
      existing.circle?.setMap(null);
    }

    const marker = new naverObj.maps.Marker({
      map,
      position: new naverObj.maps.LatLng(userData.latitude, userData.longitude),
      icon: {
        content: createOtherMarkerContent(userData),
        size: new naverObj.maps.Size(48, 48),
        anchor: new naverObj.maps.Point(24, 24),
      },
      zIndex: 500,
    });

    const nextEntry: OtherUserMarker = {
      marker,
      circle: new naverObj.maps.Circle({
        map,
        center: new naverObj.maps.LatLng(userData.latitude, userData.longitude),
        radius: USER_RADIUS_METERS,
        fillColor: "#10B981",
        fillOpacity: 0.13,
        strokeColor: "#10B981",
        strokeOpacity: 0.45,
        strokeWeight: 1.5,
      }),
      userData,
    };

    otherUsersMarkersRef.current.set(userData.id, nextEntry);
    syncInfoWindowByDistance(nextEntry, naverObj, map);
  }, [syncInfoWindowByDistance]);

  useEffect(() => {
    currentLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    return () => {
      safeRevokeObjectUrl(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  const openCreateRoomModal = useCallback((targetUserId: string) => {
    const target = otherUsersMarkersRef.current.get(targetUserId)?.userData;
    if (!target) return;

    setRoomTargetUser(target);
    setRoomName(`${target.nickname || "사용자"} 모임`);
    setRoomDescription("");
    setMemberLimit(2);
    setThumbnailFile(null);
    safeRevokeObjectUrl(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(target.avatar_url || null);
    setIsCreateRoomOpen(true);
  }, [thumbnailPreviewUrl]);

  const closeCreateRoomModal = useCallback(() => {
    setIsCreateRoomOpen(false);
    setRoomTargetUser(null);
    setRoomName("");
    setRoomDescription("");
    setMemberLimit(2);
    setThumbnailFile(null);
    safeRevokeObjectUrl(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(null);
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button[data-map-action]") as HTMLButtonElement | null;
      if (!button) return;

      const action = button.dataset.mapAction;
      const targetUserId = button.dataset.userId;
      if (!action || !targetUserId) return;
      if (!userId) {
        alert("로그인 정보가 없습니다.");
        return;
      }

      const prevDisabled = button.disabled;
      const prevOpacity = button.style.opacity;
      button.disabled = true;
      button.style.opacity = "0.6";

      try {
        if (action === "chat") {
          openCreateRoomModal(targetUserId);
        } else if (action === "friend") {
          const res = await fetch("/api/friends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requesterId: userId,
              addresseeId: targetUserId,
            }),
          });

          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };

          if (!res.ok) {
            throw new Error(data.error || "친구 요청 처리에 실패했습니다.");
          }

          alert(data.message || "친구 요청이 처리되었습니다.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
        alert(message);
      } finally {
        button.disabled = prevDisabled;
        button.style.opacity = prevOpacity;
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router, userId, openCreateRoomModal]);

  // watchPosition for live location tracking
  useEffect(() => {
    const fallbackLocation = { latitude: 37.5665, longitude: 126.978 };
    let settled = false;

    const finishWith = (location: UserLocation, accuracy?: number) => {
      if (settled) return;
      settled = true;
      if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
        currentAccuracyRef.current = accuracy;
      }
      setUserLocation(location);
      setIsLocationLoading(false);
    };

    if (!navigator.geolocation) {
      finishWith(fallbackLocation);
      return;
    }

    // 브라우저 권한/센서 이슈로 콜백이 오지 않는 경우를 대비한 안전 타임아웃
    const hardTimeout = window.setTimeout(() => {
      finishWith(fallbackLocation);
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        finishWith({ latitude, longitude }, accuracy);
      },
      () => {
        finishWith(fallbackLocation);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy && accuracy > MAX_UI_ACCURACY_METERS) return;
        currentAccuracyRef.current = typeof accuracy === "number" ? accuracy : null;
        if (!settled) finishWith({ latitude, longitude }, accuracy);
        setUserLocation({ latitude, longitude });
      },
      (error) => {
        console.error("watchPosition error:", error);
        if (!settled) finishWith(fallbackLocation);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      window.clearTimeout(hardTimeout);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // throttled DB sync every 10s or more
  useEffect(() => {
    if (!userId || !userLocation) return;
    if (
      typeof currentAccuracyRef.current === "number" &&
      currentAccuracyRef.current > MAX_SYNC_ACCURACY_METERS
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastSyncAtRef.current < LOCATION_UPDATE_THROTTLE_MS) return;

    const previous = lastSentLocationRef.current;
    if (previous) {
      const moved = getDistanceMeters(previous, userLocation);
      if (moved < 1) return;
    }

    let cancelled = false;

    const syncLocation = async () => {
      lastSyncAtRef.current = Date.now();

      try {
        const response = await fetch("/api/location/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }),
        });

        if (!cancelled && response.ok) {
          lastSentLocationRef.current = userLocation;
        }
      } catch (error) {
        console.error("location sync error:", error);
      }
    };

    syncLocation();
    return () => {
      cancelled = true;
    };
  }, [userId, userLocation]);

  // map bootstrap
  useEffect(() => {
    if (!isScriptLoaded || !userLocation || !mapDivRef.current || mapRef.current) return;
    if (typeof window === "undefined" || !(window as any).naver?.maps?.LatLng) return;

    const naverObj = (window as any).naver;

    const map = new naverObj.maps.Map(mapDivRef.current, {
      center: new naverObj.maps.LatLng(userLocation.latitude, userLocation.longitude),
      zoom: 17,
      zoomControl: true,
      zoomControlOptions: { position: naverObj.maps.Position.TOP_RIGHT },
    });
    mapRef.current = map;

    markerRef.current = new naverObj.maps.Marker({
      map,
      position: new naverObj.maps.LatLng(userLocation.latitude, userLocation.longitude),
      icon: {
        content: createMyMarkerContent(),
        size: new naverObj.maps.Size(48, 48),
        anchor: new naverObj.maps.Point(24, 24),
      },
      zIndex: 1000,
    });

    circleRef.current = new naverObj.maps.Circle({
      map,
      center: new naverObj.maps.LatLng(userLocation.latitude, userLocation.longitude),
      radius: USER_RADIUS_METERS,
      fillColor: "#3B82F6",
      fillOpacity: 0.2,
      strokeColor: "#3B82F6",
      strokeOpacity: 0.5,
      strokeWeight: 2,
    });

    if (!document.getElementById("naver-map-pulse-style")) {
      const style = document.createElement("style");
      style.id = "naver-map-pulse-style";
      style.textContent = `
        @keyframes naver-map-pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }

    class PulseOverlay extends naverObj.maps.OverlayView {
      private pulseElement: HTMLDivElement;

      constructor() {
        super();
        this.pulseElement = document.createElement("div");
        this.pulseElement.style.cssText = `
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.3);
          border: 2px solid rgba(59, 130, 246, 0.5);
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: naver-map-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          z-index: 999;
        `;
      }

      onAdd() {
        this.draw();
      }

      onRemove() {
        this.pulseElement.remove();
      }

      draw() {
        const projection = this.getProjection();
        const current = currentLocationRef.current;
        if (!projection || !current) return;

        const pixel = projection.fromCoordToOffset(new naverObj.maps.LatLng(current.latitude, current.longitude));
        this.pulseElement.style.left = `${pixel.x}px`;
        this.pulseElement.style.top = `${pixel.y}px`;

        if (mapDivRef.current && !mapDivRef.current.contains(this.pulseElement)) {
          mapDivRef.current.appendChild(this.pulseElement);
        }
      }
    }

    const pulseOverlay = new PulseOverlay();
    pulseOverlay.setMap(map);
    pulseOverlayRef.current = pulseOverlay as unknown as naver.maps.OverlayView;

    onMapLoad?.(map);
    setIsMapReady(true);

    return () => {
      setIsMapReady(false);
      safeSetMapNull(markerRef.current as any);
      safeSetMapNull(circleRef.current as any);
      safeSetMapNull(pulseOverlayRef.current as any);

      otherUsersMarkersRef.current.forEach((entry) => {
        entry.infoWindow?.close();
        safeSetMapNull(entry.marker as any);
        safeSetMapNull(entry.circle as any);
      });
      otherUsersMarkersRef.current.clear();

      mapRef.current = null;
    };
  }, [isScriptLoaded, userLocation, onMapLoad]);

  // keep map centered at current user location
  useEffect(() => {
    if (!mapRef.current || !userLocation || typeof window === "undefined") return;

    const naverObj = (window as any).naver;
    if (!naverObj?.maps?.LatLng) return;
    const nextPos = new naverObj.maps.LatLng(userLocation.latitude, userLocation.longitude);

    mapRef.current.setCenter(nextPos);
    markerRef.current?.setPosition(nextPos);
    circleRef.current?.setCenter(nextPos);

    const pulseOverlay = pulseOverlayRef.current as any;
    if (pulseOverlay?.draw) pulseOverlay.draw();

    otherUsersMarkersRef.current.forEach((entry) => {
      if (entry.userData.latitude != null && entry.userData.longitude != null) {
        entry.circle?.setCenter(new naverObj.maps.LatLng(entry.userData.latitude, entry.userData.longitude));
      }
      syncInfoWindowByDistance(entry, naverObj, mapRef.current!);
    });
  }, [userLocation, syncInfoWindowByDistance]);

  // realtime users subscription
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !isScriptLoaded) return;
    if (typeof window === "undefined" || !(window as any).naver) return;

    const naverObj = (window as any).naver;
    let active = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const bootstrapRealtime = async () => {
      const { data: initialUsers, error } = await supabase
        .from("users")
        .select("id, latitude, longitude, avatar_url, nickname")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (!active) return;

      if (error) {
        console.error("initial users fetch error:", error);
      } else if (initialUsers) {
        initialUsers.forEach((user) => {
          if (user.id === userId || user.latitude == null || user.longitude == null) return;
          createOrUpdateOtherUserMarker(user as SupabaseUser, naverObj, mapRef.current!);
        });
      }

      realtimeChannel = supabase
        .channel("user-locations")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users", filter: `id=neq.${userId || ""}` },
          (payload) => {
            const newUser = payload.new as SupabaseUser | null;
            const oldUser = payload.old as SupabaseUser | null;

            if (payload.eventType === "DELETE") {
              const removedId = oldUser?.id;
              if (removedId) removeOtherUserMarker(removedId);
              return;
            }

            if (!newUser?.id || newUser.latitude == null || newUser.longitude == null) {
              const targetId = newUser?.id || oldUser?.id;
              if (targetId) removeOtherUserMarker(targetId);
              return;
            }

            createOrUpdateOtherUserMarker(newUser, naverObj, mapRef.current!);
          }
        )
        .subscribe();
    };

    bootstrapRealtime();

    return () => {
      active = false;
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      otherUsersMarkersRef.current.forEach((entry) => {
        entry.infoWindow?.close();
        entry.marker.setMap(null);
        entry.circle?.setMap(null);
      });
      otherUsersMarkersRef.current.clear();
    };
  }, [isMapReady, isScriptLoaded, userId, createOrUpdateOtherUserMarker, removeOtherUserMarker]);

  const mapCredential =
    process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID ||
    process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ||
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  const handlePickThumbnail = () => {
    thumbnailInputRef.current?.click();
  };

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    safeRevokeObjectUrl(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateLocationRoom = async () => {
    if (!userId || !roomTargetUser) return;

    const title = roomName.trim();
    const description = roomDescription.trim();
    if (!title) {
      alert("채팅방 이름을 입력해주세요.");
      return;
    }
    if (title.length > 30) {
      alert("채팅방 이름은 30자 이하로 입력해주세요.");
      return;
    }
    if (description.length > 300) {
      alert("채팅방 설명은 300자 이하로 입력해주세요.");
      return;
    }

    setIsCreatingRoom(true);
    try {
      let thumbnailUrl = thumbnailPreviewUrl || roomTargetUser.avatar_url || null;

      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("image", thumbnailFile);
        const uploadRes = await fetch("/api/upload/profile", {
          method: "POST",
          body: formData,
        });
        const uploadData = (await uploadRes.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "썸네일 업로드에 실패했습니다.");
        }
        thumbnailUrl = uploadData.url;
      }

      const res = await fetch("/api/chats/location-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: userId,
          targetUserId: roomTargetUser.id,
          roomName: title,
          description,
          thumbnailUrl,
          memberLimit,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "채팅방 생성에 실패했습니다.");
      }

      alert("채팅방이 생성되었습니다.");
      closeCreateRoomModal();
      router.push("/home");
    } catch (error) {
      const message = error instanceof Error ? error.message : "채팅방 생성 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  if (!mapCredential) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <p className="text-gray-600">Naver Maps Client ID가 설정되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?${authQueryKey}=${mapCredential}${scriptBusterRef.current}`}
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
        onError={() => {
          console.error("Failed to load Naver Maps API");
          if (authQueryKey === "ncpKeyId") {
            // 구 콘솔 키일 경우 ncpClientId 방식으로 한번 더 시도합니다.
            setAuthQueryKey("ncpClientId");
            return;
          }
          setMapLoadError("지도를 불러오지 못했습니다. 네이버 지도 키 유형/도메인 설정을 확인해주세요.");
        }}
      />

      <div ref={mapDivRef} className={`relative h-full w-full ${className}`}>
        {mapLoadError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 px-6">
            <p className="text-center text-sm text-red-500">{mapLoadError}</p>
          </div>
        )}
        {isLocationLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-gray-600">위치를 가져오는 중...</p>
            </div>
          </div>
        )}
      </div>

      {isCreateRoomOpen && roomTargetUser && (
        <div className="fixed inset-0 z-40 bg-white">
          <div className="mx-auto flex h-full w-full max-w-md flex-col px-6 pt-6 pb-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={closeCreateRoomModal}
                className="rounded-full p-2 text-gray-700 hover:bg-gray-100"
                aria-label="닫기"
              >
                ←
              </button>
              <h2 className="text-base font-semibold text-gray-900">채팅방 만들기</h2>
              <button
                type="button"
                onClick={handleCreateLocationRoom}
                disabled={isCreatingRoom}
                className="text-sm font-semibold text-blue-600 disabled:text-gray-400"
              >
                완료
              </button>
            </div>

            <div className="mb-5 flex justify-center">
              <button
                type="button"
                onClick={handlePickThumbnail}
                className="relative h-28 w-28 overflow-hidden rounded-xl bg-gray-200"
              >
                {thumbnailPreviewUrl ? (
                  <img src={thumbnailPreviewUrl} alt="썸네일" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 text-xs">🖼️</span>
              </button>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />
            </div>

            <div className="mb-2 text-xs text-gray-500">채팅방 정보</div>

            <label className="mb-1 text-sm font-medium text-gray-700">채팅방 이름</label>
            <div className="mb-3 rounded-xl border border-gray-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="채팅방 이름을 입력해주세요 (필수)"
                  className="h-8 flex-1 bg-transparent text-sm outline-none"
                  maxLength={30}
                />
                <span className="text-xs text-gray-400">{roomName.length}/30</span>
              </div>
            </div>

            <label className="mb-1 text-sm font-medium text-gray-700">채팅방 설명</label>
            <div className="mb-3 rounded-xl border border-gray-200 px-3 py-2">
              <textarea
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="채팅방 소개에 대해 설명해주세요"
                className="h-24 w-full resize-none bg-transparent text-sm outline-none"
                maxLength={300}
              />
              <div className="text-right text-xs text-gray-400">{roomDescription.length}/300</div>
            </div>

            <div className="mb-2 text-xs text-gray-500">참여 제한</div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">인원 제한</span>
              <span className="text-sm font-semibold text-gray-900">{String(memberLimit).padStart(2, "0")}</span>
            </div>

            <div className="h-36 overflow-y-auto rounded-xl border border-gray-200">
              {Array.from({ length: 99 }, (_, idx) => idx + 2).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMemberLimit(num)}
                  className={`block h-10 w-full text-center text-lg ${
                    memberLimit === num ? "bg-gray-100 font-semibold text-blue-600" : "text-gray-400"
                  }`}
                >
                  {String(num).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

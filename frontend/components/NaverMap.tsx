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
  color: string;
}

const LOCATION_UPDATE_THROTTLE_MS = 10_000;
const USER_RADIUS_METERS = 10;
const OVERLAP_METERS = USER_RADIUS_METERS * 2;
const MAX_SYNC_ACCURACY_METERS = 120;
const MAX_UI_ACCURACY_METERS = 300;
const OTHER_USER_COLORS = ["#10B981", "#EC4899", "#38BDF8", "#FACC15", "#FFFFFF"] as const;

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

function createMyMarkerContent(avatarUrl?: string | null) {
  const safeAvatarUrl = (avatarUrl || "").trim();
  if (safeAvatarUrl) {
    return `
      <div style="
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-image: url('${safeAvatarUrl}');
        background-size: cover;
        background-position: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border: 3px solid white;
      "></div>
    `;
  }

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

function createOtherMarkerContent(userData: SupabaseUser, fallbackColor: string) {
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
      background: ${fallbackColor};
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

export function NaverMap({ className = "", onMapLoad, userId }: NaverMapProps) {
  const router = useRouter();
  const mapRef = useRef<naver.maps.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<naver.maps.Marker | null>(null);
  const circleRef = useRef<naver.maps.Circle | null>(null);
  const pulseOverlayRef = useRef<naver.maps.OverlayView | null>(null);
  const otherUsersMarkersRef = useRef<Map<string, OtherUserMarker>>(new Map());
  const otherUserOrderRef = useRef<string[]>([]);
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
  const [isOverlapUsersOpen, setIsOverlapUsersOpen] = useState(false);
  const [roomTargetUser, setRoomTargetUser] = useState<SupabaseUser | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [overlapUsers, setOverlapUsers] = useState<SupabaseUser[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newChatBannerVisible, setNewChatBannerVisible] = useState(false);
  const prevOverlapUserIdsRef = useRef<Set<string>>(new Set());
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

  const getOtherUserColor = useCallback((targetUserId: string) => {
    let index = otherUserOrderRef.current.indexOf(targetUserId);
    if (index === -1) {
      otherUserOrderRef.current.push(targetUserId);
      index = otherUserOrderRef.current.length - 1;
    }
    return OTHER_USER_COLORS[index % OTHER_USER_COLORS.length];
  }, []);

  const syncOverlapUsers = useCallback(() => {
    const my = currentLocationRef.current;
    if (!my) {
      setOverlapUsers([]);
      prevOverlapUserIdsRef.current.clear();
      return;
    }

    const overlapped = Array.from(otherUsersMarkersRef.current.values())
      .map((entry) => entry.userData)
      .filter((user) => user.latitude != null && user.longitude != null)
      .filter((user) =>
        getDistanceMeters(my, { latitude: user.latitude!, longitude: user.longitude! }) <= OVERLAP_METERS
      );

    const currentIds = new Set(overlapped.map((u) => u.id));
    const prevIds = prevOverlapUserIdsRef.current;

    // 새로운 유저가 추가되었는지 확인
    if (prevIds.size > 0 && currentIds.size > prevIds.size) {
      const newUserIds = Array.from(currentIds).filter((id) => !prevIds.has(id));
      if (newUserIds.length > 0) {
        setNewChatBannerVisible(true);
        window.setTimeout(() => {
          setNewChatBannerVisible(false);
        }, 5000);
      }
    }

    prevOverlapUserIdsRef.current = currentIds;
    setOverlapUsers(overlapped);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).naver?.maps) {
      setIsScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadMyProfile = async () => {
      try {
        const res = await fetch(`/api/users/profile?userId=${userId}`);
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as {
          user?: { avatar_url?: string | null };
        };
        if (!cancelled) {
          setMyAvatarUrl(data.user?.avatar_url || null);
        }
      } catch {
        if (!cancelled) setMyAvatarUrl(null);
      }
    };

    loadMyProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 1900);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!newChatBannerVisible) return;
    const timer = window.setTimeout(() => {
      setNewChatBannerVisible(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [newChatBannerVisible]);

  const removeOtherUserMarker = useCallback((targetUserId: string) => {
    const existing = otherUsersMarkersRef.current.get(targetUserId);
    if (!existing) return;

    existing.infoWindow?.close();
    existing.marker.setMap(null);
    existing.circle?.setMap(null);
    otherUsersMarkersRef.current.delete(targetUserId);
    otherUserOrderRef.current = otherUserOrderRef.current.filter((id) => id !== targetUserId);
    syncOverlapUsers();
  }, []);

  const createOrUpdateOtherUserMarker = useCallback((userData: SupabaseUser, naverObj: any, map: naver.maps.Map) => {
    if (userData.latitude == null || userData.longitude == null) return;
    const color = getOtherUserColor(userData.id);

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
        content: createOtherMarkerContent(userData, color),
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
        fillColor: color,
        fillOpacity: 0.13,
        strokeColor: color === "#FFFFFF" ? "#D1D5DB" : color,
        strokeOpacity: 0.45,
        strokeWeight: 1.5,
      }),
      userData,
      color,
    };

    otherUsersMarkersRef.current.set(userData.id, nextEntry);
    syncOverlapUsers();
  }, [getOtherUserColor, syncOverlapUsers]);

  useEffect(() => {
    currentLocationRef.current = userLocation;
  }, [userLocation]);

  // Hide map controls when create room modal is open
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const naverObj = (window as any).naver;
    if (!naverObj?.maps) return;

    const map = mapRef.current as any;
    if (isCreateRoomOpen) {
      // Hide zoom control
      const zoomControls = mapDivRef.current?.querySelectorAll(".nmap_zoom_control");
      zoomControls?.forEach((el: any) => {
        (el as HTMLElement).style.display = "none";
      });
      // Hide scale control
      const scaleControls = mapDivRef.current?.querySelectorAll(".nmap_scale_control");
      scaleControls?.forEach((el: any) => {
        (el as HTMLElement).style.display = "none";
      });
      // Hide marker and circle
      if (markerRef.current) {
        (markerRef.current as any).setMap(null);
      }
      if (circleRef.current) {
        (circleRef.current as any).setMap(null);
      }
      // Disable map scrolling
      map.setOptions({ draggable: false, scrollWheelZoom: false });
    } else {
      // Show zoom control
      const zoomControls = mapDivRef.current?.querySelectorAll(".nmap_zoom_control");
      zoomControls?.forEach((el: any) => {
        (el as HTMLElement).style.display = "";
      });
      // Show scale control
      const scaleControls = mapDivRef.current?.querySelectorAll(".nmap_scale_control");
      scaleControls?.forEach((el: any) => {
        (el as HTMLElement).style.display = "";
      });
      // Show marker and circle
      if (markerRef.current && userLocation) {
        (markerRef.current as any).setMap(map);
      }
      if (circleRef.current && userLocation) {
        (circleRef.current as any).setMap(map);
      }
      // Enable map scrolling
      map.setOptions({ draggable: true, scrollWheelZoom: true });
    }
  }, [isCreateRoomOpen, userLocation]);

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
    setThumbnailPreviewUrl(null);
    setIsOverlapUsersOpen(false);
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
      scaleControl: true,
      scaleControlOptions: { position: naverObj.maps.Position.BOTTOM_LEFT },
    });
    mapRef.current = map;

    markerRef.current = new naverObj.maps.Marker({
      map,
      position: new naverObj.maps.LatLng(userLocation.latitude, userLocation.longitude),
      icon: {
        content: createMyMarkerContent(myAvatarUrl),
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

  useEffect(() => {
    if (!markerRef.current || typeof window === "undefined") return;
    const naverObj = (window as any).naver;
    if (!naverObj?.maps?.Size || !naverObj?.maps?.Point) return;
    (markerRef.current as any).setIcon({
      content: createMyMarkerContent(myAvatarUrl),
      size: new naverObj.maps.Size(48, 48),
      anchor: new naverObj.maps.Point(24, 24),
    });
  }, [myAvatarUrl]);

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
    });
    syncOverlapUsers();
  }, [userLocation, syncOverlapUsers]);

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

  const handleMoveToMyLocation = () => {
    if (!mapRef.current || !userLocation || typeof window === "undefined") return;
    const naverObj = (window as any).naver;
    if (!naverObj?.maps?.LatLng) return;
    const center = new naverObj.maps.LatLng(userLocation.latitude, userLocation.longitude);
    mapRef.current.panTo(center);
    setToastMessage("현재 위치로 이동했습니다.");
  };

  const handleOpenOverlapUsers = () => {
    syncOverlapUsers();
    setIsOverlapUsersOpen(true);
  };

  const handleAddFriend = async (targetUserId: string) => {
    if (!userId) return;
    try {
      // Find user info from overlap users or other users markers
      const targetUser = overlapUsers.find((u) => u.id === targetUserId) || 
                        otherUsersMarkersRef.current.get(targetUserId)?.userData;
      
      if (!targetUser) {
        alert("사용자 정보를 찾을 수 없습니다.");
        return;
      }
      const userName = targetUser?.nickname || "사용자";

      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: userId, addresseeId: targetUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "친구 요청 처리에 실패했습니다.");
      setToastMessage(`${userName}님이 친구목록에 추가되었습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "친구 요청 처리 중 오류가 발생했습니다.";
      alert(message);
    }
  };

  const handleOpenRoomForUser = async (target: SupabaseUser) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/chats?userId=${userId}`);
      if (!res.ok) throw new Error("채팅 목록을 확인하지 못했습니다.");
      const chatList = (await res.json()) as Array<{ other_user_id?: string; chat_type?: string }>;
      const hasSharedChat = chatList.some((chat) => chat.other_user_id === target.id);
      if (hasSharedChat) {
        setToastMessage("함께하는 채팅방이 존재합니다.");
        return;
      }
      openCreateRoomModal(target.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "채팅방 확인 중 오류가 발생했습니다.");
    }
  };

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
        if (res.status === 409) {
          setToastMessage(data.error || "함께하는 채팅방이 존재합니다.");
          closeCreateRoomModal();
          return;
        }
        throw new Error(data.error || "채팅방 생성에 실패했습니다.");
      }

      setToastMessage("채팅방이 생성되었습니다.");
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

      <div ref={mapDivRef} className={`relative h-full w-full ${className} ${isCreateRoomOpen ? "hidden" : ""}`}>
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
        {isCreateRoomOpen && (
          <style jsx global>{`
            .nmap_zoom_control,
            .nmap_scale_control {
              display: none !important;
            }
            [id^="naver-map"] {
              overflow: hidden !important;
            }
          `}</style>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 mx-auto w-full max-w-md px-4">
        <div className="pointer-events-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleMoveToMyLocation}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-lg"
            aria-label="내 위치로 이동"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          {overlapUsers.length > 0 && (
            <button
              type="button"
              onClick={handleOpenOverlapUsers}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/95 text-white shadow-lg"
              aria-label="겹친 사용자 보기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isOverlapUsersOpen && (
        <div className="fixed inset-0 z-40 bg-black/45">
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-white px-5 pb-7 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                나 포함 {overlapUsers.length + 1}명 원이 겹쳐져 있어요
              </p>
              <button
                type="button"
                onClick={() => setIsOverlapUsersOpen(false)}
                className="rounded-full px-2 py-1 text-sm text-gray-500"
              >
                닫기
              </button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {overlapUsers.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-7 text-center text-sm text-gray-500">
                  현재 원이 겹친 사용자가 없습니다.
                </div>
              ) : (
                overlapUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.nickname || "user"} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{user.nickname || "사용자"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddFriend(user.id)}
                        className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700"
                      >
                        친구추가
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRoomForUser(user)}
                        className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white"
                      >
                        채팅방 만들기
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 w-[85%] max-w-sm -translate-x-1/2 rounded-full bg-black/65 px-4 py-2.5 text-center text-sm text-white">
          {toastMessage}
        </div>
      )}

      {newChatBannerVisible && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-50 w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-auto rounded-2xl bg-gray-800/90 px-5 py-4 text-center shadow-xl backdrop-blur-sm">
            <p className="text-sm font-medium text-white">새로운 대화를 시작해볼 수 있어요</p>
          </div>
        </div>
      )}

      {isCreateRoomOpen && roomTargetUser && (
        <div className="fixed inset-0 z-50 bg-white">
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
                {thumbnailPreviewUrl && (
                  <img src={thumbnailPreviewUrl} alt="썸네일" className="h-full w-full object-cover" />
                )}
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
                  placeholder="채팅방 이름을 입력해주세요. (필수)"
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

            <div
              className="h-36 overflow-y-auto rounded-xl border border-gray-200 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              onScroll={(e) => {
                const target = e.currentTarget;
                const scrollTop = target.scrollTop;
                const scrollHeight = target.scrollHeight;
                const clientHeight = target.clientHeight;

                // At the top, scroll to bottom (100)
                if (scrollTop === 0) {
                  setTimeout(() => {
                    target.scrollTop = scrollHeight - clientHeight;
                  }, 50);
                }
                // At the bottom, scroll to top (2)
                else if (Math.abs(scrollTop + clientHeight - scrollHeight) < 1) {
                  setTimeout(() => {
                    target.scrollTop = 0;
                  }, 50);
                }
              }}
            >
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

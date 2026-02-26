"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { Camera, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import Link from "next/link";

function SignupStep2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 아이디와 비밀번호를 세션 스토리지에서 가져오기 또는 구글 로그인 정보
  const [signupData, setSignupData] = useState<{
    username?: string;
    password?: string;
    googleAuth?: boolean;
    userId?: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  } | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  useEffect(() => {
    // URL 쿼리 파라미터에서 구글 로그인 정보 확인
    const googleAuth = searchParams.get("google_auth") === "true";
    
    console.log("SignupStep2 - googleAuth:", googleAuth, "searchParams:", Object.fromEntries(searchParams.entries()));
    
    if (googleAuth) {
      // 구글 로그인 사용자
      setIsGoogleUser(true);
      const googleData = {
        googleAuth: true,
        userId: searchParams.get("user_id") || undefined,
        email: searchParams.get("email") || undefined,
        name: searchParams.get("name") || undefined,
        avatarUrl: searchParams.get("avatar_url") || undefined,
        nickname: searchParams.get("nickname") || undefined,
        phoneNumber: searchParams.get("phone_number") || undefined,
      };
      console.log("SignupStep2 - Google user data:", googleData);
      setSignupData(googleData);
      
      // 구글 사용자 정보를 세션 스토리지에 저장
      sessionStorage.setItem("signup_google", JSON.stringify(googleData));
      
      // 기존 정보가 있으면 채우기 (구글 프로필 정보 자동 연동)
      if (googleData.nickname) {
        setNickname(googleData.nickname);
      }
      if (googleData.name) {
        setName(googleData.name);
      }
      // 구글 프로필 이미지 자동 연동
      if (googleData.avatarUrl) {
        setProfileImage(googleData.avatarUrl);
      }
      
    } else {
      // 일반 회원가입
      const data = sessionStorage.getItem("signup_step1");
      if (data) {
        setSignupData(JSON.parse(data));
      } else {
        // 1단계 데이터가 없으면 1단계로 리다이렉트
        router.push("/signup");
      }
    }
  }, [router, searchParams]);

  // 프로필 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 닉네임 중복 확인
  const checkNickname = async (value: string) => {
    if (!value.trim()) {
      setNicknameError(null);
      return;
    }

    // 닉네임 유효성 검사 (한글, 영문 대소문자만)
    const nicknameRegex = /^[가-힣a-zA-Z]+$/;
    if (!nicknameRegex.test(value)) {
      setNicknameError("한글, 영문 대/소문자를 사용해 주세요. (특수기호, 공백 사용 불가)");
      return;
    }

    setIsCheckingNickname(true);
    try {
      const res = await fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(value)}`);
      const data = await res.json();

      if (res.ok && data.available) {
        setNicknameError(null);
      } else {
        setNicknameError("이미 사용중인 닉네임 입니다.");
      }
    } catch (error) {
      console.error("Nickname check error:", error);
    } finally {
      setIsCheckingNickname(false);
    }
  };

  // 이름 유효성 검사
  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError(null);
      return;
    }

    const nameRegex = /^[가-힣a-zA-Z]+$/;
    if (!nameRegex.test(value)) {
      setNameError("한글, 영문 대/소문자를 사용해 주세요. (특수기호, 공백 사용 불가)");
    } else {
      setNameError(null);
    }
  };

  // 닉네임 변경 시 디바운싱하여 중복 확인
  useEffect(() => {
    if (!nickname.trim()) {
      setNicknameError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkNickname(nickname);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [nickname]);

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    validateName(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!nickname.trim()) {
      setNicknameError("닉네임을 입력해주세요.");
      return;
    }
    if (!name.trim()) {
      setNameError("이름을 입력해주세요.");
      return;
    }
    if (nicknameError || nameError) {
      return;
    }

    setIsLoading(true);

    try {
      // 프로필 이미지 업로드 (있는 경우)
      let avatarUrl = null;
      if (profileImage) {
        if (profileImage.startsWith("data:")) {
          // Base64 이미지 (로컬에서 선택한 이미지)
          try {
            const formData = new FormData();
            const response = await fetch(profileImage);
            const blob = await response.blob();
            formData.append("image", blob, "profile.jpg");

            const uploadRes = await fetch("/api/upload/profile", {
              method: "POST",
              body: formData,
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              avatarUrl = uploadData.url;
            }
          } catch (uploadError) {
            console.error("Image upload error:", uploadError);
            // 업로드 실패해도 계속 진행
          }
        } else if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
          // 외부 URL (구글 프로필 이미지 등)
          try {
            const uploadRes = await fetch("/api/upload/profile-from-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: profileImage }),
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              avatarUrl = uploadData.url;
            } else {
              // 다운로드 실패 시 원본 URL 사용
              console.warn("Failed to download image from URL, using original URL");
              avatarUrl = profileImage;
            }
          } catch (uploadError) {
            console.error("Image download error:", uploadError);
            // 다운로드 실패 시 원본 URL 사용
            avatarUrl = profileImage;
          }
        } else if (profileImage.startsWith("/")) {
          // 이미 서버에 저장된 이미지
          avatarUrl = profileImage;
        } else {
          // 기타 경우 원본 사용
          avatarUrl = profileImage;
        }
      }

      // 2단계 데이터 저장
      const step2Data = {
        ...signupData,
        nickname,
        name,
        avatarUrl,
      };
      
      if (isGoogleUser) {
        // 구글 로그인 사용자는 구글 데이터와 합치기
        const googleData = sessionStorage.getItem("signup_google");
        if (googleData) {
          const google = JSON.parse(googleData);
          step2Data.googleAuth = true;
          step2Data.userId = google.userId;
          step2Data.email = google.email;
        }
        sessionStorage.setItem("signup_step2", JSON.stringify(step2Data));
      } else {
        sessionStorage.setItem("signup_step2", JSON.stringify(step2Data));
      }

      // 다음 단계로 이동
      router.push("/signup/step3");
    } catch (error) {
      console.error("Step 2 error:", error);
      setNicknameError("처리 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isFormValid =
    nickname.trim() &&
    name.trim() &&
    !nicknameError &&
    !nameError &&
    !isCheckingNickname;

  return (
    <div className="min-h-screen bg-white flex flex-col px-4 py-8">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-900 text-3xl font-normal">
          &lt;
        </button>
        <h1 className="text-lg font-normal text-gray-900 flex-1 text-center">회원가입</h1>
        <div className="text-sm text-gray-500">{isGoogleUser ? "1/4" : "2/5"}</div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-sm mx-auto w-full">
        <p className="text-gray-700 mb-8">계정 정보를 입력해주세요</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로필 이미지 */}
          <div className="flex flex-col items-center mb-6">
            <label className="text-sm text-gray-600 mb-2">프로필 이미지</label>
            <div className="relative">
              <div
                className={cn(
                  "relative w-32 h-32 rounded-full flex items-center justify-center cursor-pointer transition-colors overflow-hidden",
                  profileImage
                    ? "bg-blue-500"
                    : "bg-gray-200 border-2 border-dashed border-gray-300"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              {profileImage && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 text-white" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* 닉네임 입력 */}
          <div>
            <Input
              label="닉네임"
              type="text"
              value={nickname}
              onChange={handleNicknameChange}
              placeholder="닉네임을 입력해주세요."
              className="bg-white"
              error={nicknameError || undefined}
            />
            {nickname && !nicknameError && !isCheckingNickname && (
              <p className="mt-1.5 text-sm text-blue-500">
                사용가능한 닉네임 입니다.
              </p>
            )}
          </div>

          {/* 이름 입력 */}
          <div>
            <Input
              label="이름"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="이름을 입력해주세요."
              className="bg-white"
              error={nameError || undefined}
            />
          </div>

          {/* 다음 버튼 */}
          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={cn(
              "w-full font-medium py-3 rounded-lg",
              isFormValid
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {isLoading ? "처리 중..." : "다음"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SignupStep2Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <SignupStep2Content />
    </Suspense>
  );
}

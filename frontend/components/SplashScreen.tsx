"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LOGO_PATHS } from "@/lib/constants";

export function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // 3초 후 로그인 페이지로 이동
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen w-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#6983FC' }}>
      {/* 1. 전체 컨테이너 최대 너비를 키워 로고 크기 자체를 확대함 (450px -> 500px) */}
      <div className="flex flex-col items-center justify-center w-full max-w-[400px] md:max-w-[500px] px-6">
        
        {/* 2. 메인 로고 영역 */}
        <div className="relative w-full aspect-square">
          <Image
            src={LOGO_PATHS.main}
            alt="OneChat Logo"
            fill
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        {/* 3. 텍스트 영역: 
            - 음수 마진(-mt-16)을 더 크게 주어 이미지 내부 여백을 무시하고 로고 밑으로 바짝 올림
            - scale을 키워 글자 크기 확보
        */}
        <div className="relative w-full h-[60px] md:h-[80px] -mt-16 md:-mt-24 flex items-center justify-center overflow-visible">
          <Image
            src={LOGO_PATHS.text}
            alt="One Chat"
            fill
            // scale을 다시 키워 텍스트가 로고 너비와 조화를 이루게 함
            className="object-contain drop-shadow-lg scale-[1.0] md:scale-[2.2]" 
            priority
          />
        </div>
      </div>
    </div>
  );
}
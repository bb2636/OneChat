"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "관리자 로그인에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("admin_user", JSON.stringify(data.user));
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#6983FC] px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex justify-center">
          <Image 
            src="/images/logo.png" 
            alt="OneChat" 
            width={76} 
            height={76} 
            style={{ width: "auto", height: "auto" }}
            priority 
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-[11px] text-white/80">아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디를 입력하세요"
            className="h-10 w-full rounded-md border border-white/40 bg-white/15 px-3 text-sm text-white placeholder:text-white/70 outline-none focus:border-white"
          />

          <div>
            <label className="mb-1 block text-[11px] text-white/80">비밀번호</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="h-10 w-full rounded-md border border-white/40 bg-white/15 px-3 pr-10 text-sm text-white placeholder:text-white/70 outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-100">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-10 w-full rounded-md bg-white/80 text-sm font-medium text-[#334155] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}

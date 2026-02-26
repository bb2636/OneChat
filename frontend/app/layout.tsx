import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "OneChat",
  description: "위치 기반 소셜 플랫폼 OneChat",
  applicationName: "OneChat",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OneChat",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


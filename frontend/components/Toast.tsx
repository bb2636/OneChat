"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  index?: number;
}

export function Toast({ message, onClose, duration = 1000, index = 0 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div 
      className="fixed left-1/2 -translate-x-1/2 z-50 animate-slideUp"
      style={{ 
        bottom: `${16 + index * 72}px` // 16px (bottom-4) + 각 토스트 간격 72px
      }}
    >
      <div className="bg-blue-800 text-white px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-[90vw]">
        <p className="text-sm font-medium text-center">{message}</p>
      </div>
    </div>
  );
}

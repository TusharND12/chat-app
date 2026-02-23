"use client";

import { useEffect, useState } from "react";

export function FirstMessageCelebration() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center animate-in fade-in-0 duration-300"
      aria-hidden
    >
      <div className="flex gap-1 text-2xl animate-in zoom-in-50 duration-300">
        <span className="animate-bounce [animation-delay:0ms]">🎉</span>
        <span className="animate-bounce [animation-delay:100ms]">✨</span>
        <span className="animate-bounce [animation-delay:200ms]">💬</span>
      </div>
    </div>
  );
}

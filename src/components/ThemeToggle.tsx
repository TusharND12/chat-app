"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted",
        className
      )}
    >
      <Sun className={cn("size-5 transition-all duration-200", isDark ? "scale-0 rotate-90" : "scale-100 rotate-0")} />
      <Moon className={cn("absolute size-5 transition-all duration-200", isDark ? "scale-100 rotate-0" : "scale-0 -rotate-90")} />
    </button>
  );
}

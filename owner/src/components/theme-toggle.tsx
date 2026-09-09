import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dezobuild_theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("dezobuild_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("dezobuild_theme", "light");
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className={`relative grid size-8.5 place-items-center rounded-lg border border-border/80 bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer ${
        className || ""
      }`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={`size-4 transition-all ${
          isDark ? "rotate-90 scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100 text-amber-500"
        }`}
      />
      <Moon
        className={`size-4 transition-all ${
          isDark ? "rotate-0 scale-100 opacity-100 text-blue-400" : "-rotate-90 scale-0 opacity-0 absolute"
        }`}
      />
    </button>
  );
}

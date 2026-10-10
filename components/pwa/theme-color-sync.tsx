"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { THEME_COLORS } from "@/lib/constants";

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    const color = THEME_COLORS[resolvedTheme];
    for (const meta of document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )) {
      meta.content = color;
    }
  }, [resolvedTheme]);

  return null;
}

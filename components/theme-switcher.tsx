"use client"

import { Sun, Moon, SunMoon } from "lucide-react"
import { useTheme, type ThemeMode } from "@/contexts/theme-context"
import { useLocale } from "@/contexts/locale-context"

const order: ThemeMode[] = ["light", "dark", "auto"]

export function ThemeSwitcher() {
  const { mode, setMode } = useTheme()
  const { locale } = useLocale()

  const labels: Record<ThemeMode, { en: string; th: string }> = {
    light: { en: "Light", th: "กลางวัน" },
    dark: { en: "Dark", th: "กลางคืน" },
    auto: { en: "Auto", th: "อัตโนมัติ" },
  }

  const next = order[(order.indexOf(mode) + 1) % order.length]
  const label = labels[mode][locale === "th" ? "th" : "en"]
  const nextLabel = labels[next][locale === "th" ? "th" : "en"]

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : SunMoon

  return (
    <button
      onClick={() => setMode(next)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border hover:border-border text-sm text-foreground hover:text-foreground transition-all"
      title={locale === "th" ? `เปลี่ยนเป็น: ${nextLabel}` : `Switch to: ${nextLabel}`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </button>
  )
}

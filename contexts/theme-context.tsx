"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

export type ThemeMode = "light" | "dark" | "auto"
type ResolvedTheme = "light" | "dark"

interface ThemeContextType {
  /** User selected mode: light, dark, or auto (follows time of day) */
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** The theme actually applied to the page */
  resolvedTheme: ResolvedTheme
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  setMode: () => {},
  resolvedTheme: "dark",
})

const STORAGE_KEY = "theme"

/** Night time when on auto: 19:00–05:59 resolves to dark. */
export function isNightTime(date: Date = new Date()): boolean {
  const hour = date.getHours()
  return hour >= 19 || hour < 6
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "auto") return isNightTime() ? "dark" : "light"
  return mode
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark")

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved === "light" || saved === "dark" || saved === "auto") {
      setModeState(saved)
    }
  }, [])

  // Apply the resolved theme whenever the mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [mode])

  // In auto mode, re-evaluate periodically so the theme flips at sunrise/sunset
  useEffect(() => {
    if (mode !== "auto") return
    const tick = () => {
      const resolved = resolveTheme("auto")
      setResolvedTheme(resolved)
      applyTheme(resolved)
    }
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [mode])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

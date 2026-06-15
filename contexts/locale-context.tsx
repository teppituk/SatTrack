"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import en from "@/messages/en.json"
import th from "@/messages/th.json"

type Locale = "en" | "th"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "th",
  setLocale: () => {},
  t: (key: string) => key,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th")

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale
    if (saved === "en" || saved === "th") {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
  }

  const messages: Record<string, unknown> = locale === "en" ? en : th

  const t = (key: string): string => {
    const result = key.split(".").reduce((obj: unknown, k: string) => {
      if (obj && typeof obj === "object") {
        return (obj as Record<string, unknown>)[k]
      }
      return undefined
    }, messages)

    if (typeof result === "string") return result
    return key
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => useContext(LocaleContext)

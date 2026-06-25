"use client"

import { useLocale } from "@/contexts/locale-context"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "th" : "en")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border hover:border-border text-sm text-foreground hover:text-foreground transition-all"
      title={locale === "en" ? "Switch to Thai" : "เปลี่ยนเป็นภาษาอังกฤษ"}
    >
      {locale === "en" ? (
        <>
          <span>🇹🇭</span>
          <span className="font-medium">TH</span>
        </>
      ) : (
        <>
          <span>🇬🇧</span>
          <span className="font-medium">EN</span>
        </>
      )}
    </button>
  )
}

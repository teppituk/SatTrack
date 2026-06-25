"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import { FileText, ExternalLink, Download } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

type DocLang = "th" | "en";

const PDF_PATH: Record<DocLang, string> = {
  th: "/docs/bitcoin_th.pdf",
  en: "/docs/bitcoin_en.pdf",
};

export default function WhitepaperPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, locale } = useLocale();

  // Document language defaults to the app locale, but can be switched independently
  const [docLang, setDocLang] = useState<DocLang>("th");
  useEffect(() => {
    setDocLang(locale === "en" ? "en" : "th");
  }, [locale]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      </AppShell>
    );
  }

  const pdfUrl = PDF_PATH[docLang];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("whitepaper.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("whitepaper.subtitle")}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("whitepaper.languageLabel")}:</span>
            <div className="flex bg-card border border-border rounded-xl p-1">
              {(["th", "en"] as DocLang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setDocLang(lang)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    docLang === lang
                      ? "bg-blue-600 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "th" ? t("whitepaper.thai") : t("whitepaper.english")}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-xl transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              {t("whitepaper.openNewTab")}
            </a>
            <a
              href={pdfUrl}
              download={`bitcoin_${docLang}.pdf`}
              className="flex items-center gap-2 text-sm text-foreground bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-xl transition-all"
            >
              <Download className="h-4 w-4" />
              {t("whitepaper.download")}
            </a>
          </div>
        </div>

        {/* PDF viewer */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <object
            key={pdfUrl}
            data={pdfUrl}
            type="application/pdf"
            className="w-full h-[80vh]"
          >
            <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <p className="text-muted-foreground">{t("whitepaper.fallback")}</p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-foreground bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                {t("whitepaper.openNewTab")}
              </a>
            </div>
          </object>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">{t("whitepaper.source")}</p>
      </div>
    </AppShell>
  );
}

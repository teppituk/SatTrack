"use client";

import Link from "next/link";
import { ArrowLeft, Bitcoin } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export type LegalSection = { h: string; p: string[] };

export function LegalShell({
  title,
  updatedLabel,
  backLabel,
  sections,
}: {
  title: string;
  updatedLabel: string;
  backLabel: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Bitcoin className="h-6 w-6 text-orange-400" />
          <span className="text-lg font-bold text-foreground">KebSats</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{updatedLabel}</p>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {i + 1}. {s.h}
              </h2>
              {s.p.map((para, j) => (
                <p
                  key={j}
                  className="text-sm text-muted-foreground leading-relaxed mb-2 whitespace-pre-line"
                >
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

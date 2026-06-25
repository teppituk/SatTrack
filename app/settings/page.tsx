"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/nav";
import { Settings, Share2, Zap, User, ChevronRight, Shield, Globe } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const [userPlan, setUserPlan] = useState<{ plan: string; expiresAt: string | null }>({
    plan: "free",
    expiresAt: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/subscription")
        .then((r) => r.json())
        .then((d) => setUserPlan({ plan: d.currentPlan, expiresAt: d.planExpiresAt }))
        .catch(console.error);
    }
  }, [status]);

  if (status === "loading") {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      </AppShell>
    );
  }

  const settingsLinks = [
    {
      href: "/settings/subscription",
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      title: t("settings.subscription"),
      desc: `${t("settings.currentPlan")}: ${userPlan.plan === "paid" ? t("subscription.paid") : t("subscription.free")}${
        userPlan.expiresAt ? ` · ${t("subscription.expiresAt")} ${new Date(userPlan.expiresAt).toLocaleDateString()}` : ""
      }`,
      badge: userPlan.plan === "paid" ? "PRO" : "FREE",
      badgeColor: userPlan.plan === "paid" ? "bg-yellow-500/20 text-yellow-400" : "bg-accent text-muted-foreground",
    },
    {
      href: "/settings/share",
      icon: <Share2 className="h-5 w-5 text-blue-400" />,
      title: t("settings.shareLinks"),
      desc: t("settings.shareLinksDesc"),
      badge: null,
      badgeColor: "",
    },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("settings.subtitle")}</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("settings.account")}
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-foreground text-xl font-bold flex-shrink-0">
              {(session?.user?.name || session?.user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{session?.user?.name || "User"}</p>
              <p className="text-muted-foreground text-sm">{session?.user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">{t("settings.accountVerified")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("settings.languageTitle")}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => setLocale("th")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-medium transition-all ${
                locale === "th"
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span>🇹🇭</span>
              <span>ภาษาไทย</span>
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-medium transition-all ${
                locale === "en"
                  ? "bg-blue-600/20 border-blue-500 text-blue-400"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Settings Links */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          <h2 className="text-sm font-medium text-muted-foreground px-6 pt-4 pb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("settings.features")}
          </h2>
          <div className="divide-y divide-border">
            {settingsLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{link.title}</p>
                    {link.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${link.badgeColor}`}>
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="text-center text-muted-foreground text-xs">
          <p>{t("settings.appVersion")}</p>
          <p className="mt-1">{t("settings.builtWith")}</p>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Bitcoin,
  BarChart2,
  Share2,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  ChevronRight,
  User,
  Shield,
  FileText,
  Building2,
} from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useHolderTier } from "@/lib/use-holder-tier";

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t, locale } = useLocale();
  const { tier } = useHolderTier();
  const isTh = locale === "th";

  const permissions = session?.user?.permissions;
  const isAdmin = session?.user?.role === "ADMIN";

  const allNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard"), key: "dashboard" },
    { href: "/upload", icon: Bitcoin, label: t("nav.upload"), key: "upload" },
    { href: "/chart", icon: BarChart2, label: t("nav.chart"), key: "chart" },
    { href: "/exchanges", icon: Building2, label: t("exchanges.title"), key: "exchanges" },
    { href: "/settings/share", icon: Share2, label: t("nav.share"), key: "share" },
    { href: "/settings/subscription", icon: Zap, label: t("nav.subscription"), key: "subscription" },
    { href: "/settings", icon: Settings, label: t("nav.settings"), key: "settings" },
    { href: "/whitepaper", icon: FileText, label: t("nav.whitepaper"), key: "whitepaper" },
  ];

  const navItems = allNavItems.filter((item) => {
    if (isAdmin) return true;
    if (!permissions) return true;
    return permissions[item.key as keyof typeof permissions] !== false;
  });

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-orange-400" />
          <span className="font-bold text-foreground">KebSats</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-64 bg-card border-r border-border
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
          <Bitcoin className="h-6 w-6 text-orange-400" />
          <span className="text-lg font-bold text-foreground">KebSats</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive
                    ? "bg-blue-600/20 text-blue-400 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt="avatar"
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>

          {/* Accumulation tier */}
          {tier && (
            <div
              title={isTh ? tier.descTh : tier.descEn}
              className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-muted/50 border border-border"
            >
              <span className="text-lg leading-none">{tier.emoji}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${tier.color}`}>{tier.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {(isTh ? "ระดับการสะสม" : "Stacker tier") + " · " + tier.rangeLabel}
                </p>
              </div>
            </div>
          )}

          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setIsMobileOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 transition-all mb-1"
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Admin Panel</span>
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-950/30 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">{t("nav.signOut")}</span>
          </button>

          {/* Language & Theme Switchers */}
          <div className="mt-3 flex justify-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

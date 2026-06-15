"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  TrendingUp,
  LayoutDashboard,
  Upload,
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
} from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useLocale();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/upload", icon: Upload, label: t("nav.upload") },
    { href: "/chart", icon: BarChart2, label: t("nav.chart") },
    { href: "/settings/share", icon: Share2, label: t("nav.share") },
    { href: "/settings/subscription", icon: Zap, label: t("nav.subscription") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <span className="font-bold text-white">CryptoSlip</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-gray-400 hover:text-white p-1"
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
          fixed top-0 left-0 h-full z-40 w-64 bg-gray-900 border-r border-gray-800
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-800">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          <span className="text-lg font-bold text-white">CryptoSlip</span>
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
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
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
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
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
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950/30 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">{t("nav.signOut")}</span>
          </button>

          {/* Language Switcher */}
          <div className="mt-3 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

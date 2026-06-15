"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/nav";
import { Settings, Share2, Zap, User, ChevronRight, Shield } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
      title: "Subscription",
      desc: `Current plan: ${userPlan.plan === "paid" ? "Paid" : "Free"}${
        userPlan.expiresAt ? ` · Expires ${new Date(userPlan.expiresAt).toLocaleDateString()}` : ""
      }`,
      badge: userPlan.plan === "paid" ? "PRO" : "FREE",
      badgeColor: userPlan.plan === "paid" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-700 text-gray-400",
    },
    {
      href: "/settings/share",
      icon: <Share2 className="h-5 w-5 text-blue-400" />,
      title: "Share Portfolio",
      desc: "Create and manage share links",
      badge: null,
      badgeColor: "",
    },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-gray-800 rounded-xl flex items-center justify-center">
            <Settings className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-400 text-sm">Manage your account and preferences</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            ACCOUNT
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(session?.user?.name || session?.user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{session?.user?.name || "User"}</p>
              <p className="text-gray-400 text-sm">{session?.user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">Account verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Links */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
          <h2 className="text-sm font-medium text-gray-400 px-6 pt-4 pb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            FEATURES
          </h2>
          <div className="divide-y divide-gray-800">
            {settingsLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{link.title}</p>
                    {link.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${link.badgeColor}`}>
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 truncate">{link.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="text-center text-gray-600 text-xs">
          <p>CryptoSlip Tracker v0.1.0</p>
          <p className="mt-1">Built with Next.js 14, Prisma, and Claude AI</p>
        </div>
      </div>
    </AppShell>
  );
}

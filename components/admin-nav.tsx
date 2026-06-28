"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ArrowLeft,
  Shield,
  User,
  KeyRound,
  Building2,
  Zap,
  Wallet,
} from "lucide-react";

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Overview" },
    { href: "/admin/users", icon: Users, label: "User Management" },
    { href: "/admin/roles", icon: KeyRound, label: "Role Management" },
    { href: "/admin/exchanges", icon: Building2, label: "Exchange Management" },
    { href: "/admin/payments", icon: Wallet, label: "Payments" },
    { href: "/admin/settings", icon: Zap, label: "Payment Settings" },
  ];

  return (
    <aside className="fixed top-0 left-0 h-full z-40 w-64 bg-card border-r border-border flex flex-col">
      {/* Logo / Header */}
      <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
        <Shield className="h-6 w-6 text-purple-500" />
        <span className="text-lg font-bold text-foreground">Admin Panel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                ${
                  isActive
                    ? "bg-purple-600/20 text-purple-400 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
              `}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to App + User Info */}
      <div className="p-4 border-t border-border space-y-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to App</span>
        </Link>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {session?.user?.name || session?.user?.email?.split("@")[0] || "Admin"}
            </p>
            <p className="text-xs text-purple-400 truncate">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import {
  Share2,
  Plus,
  Trash2,
  Loader2,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ShareActions } from "@/components/share-actions";

interface ShareLink {
  id: string;
  token: string;
  config: {
    showCostBasis: boolean;
    showPnl: boolean;
    showTransactions: boolean;
    privacyMode?: boolean;
  };
  expiresAt: string | null;
  createdAt: string;
}

export default function ShareSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // New link config
  const [showCostBasis, setShowCostBasis] = useState(true);
  const [showPnl, setShowPnl] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [expiresIn, setExpiresIn] = useState<"never" | "24h" | "7d" | "30d">("never");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchShareLinks();
    }
  }, [status]);

  const fetchShareLinks = async () => {
    try {
      const res = await fetch("/api/share");
      if (res.ok) {
        const d = await res.json();
        setShareLinks(d.shareLinks);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showCostBasis, showPnl, showTransactions, privacyMode, expiresIn }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create share link");
        return;
      }

      const { shareLink } = await res.json();
      setShareLinks((prev) => [shareLink, ...prev]);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/share?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setShareLinks((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const getShareUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}`;

  if (status === "loading" || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
            <Share2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Share Portfolio</h1>
            <p className="text-muted-foreground text-sm">
              Create private share links to show your portfolio
            </p>
          </div>
        </div>

        {/* Create New Link */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Share Link
          </h2>

          <div className="space-y-4">
            {/* Toggles */}
            <div className="space-y-3">
              {[
                {
                  key: "showCostBasis",
                  label: "Show Cost Basis",
                  desc: "Show how much was invested",
                  value: showCostBasis,
                  setter: setShowCostBasis,
                },
                {
                  key: "showPnl",
                  label: "Show P&L",
                  desc: "Show profit & loss figures",
                  value: showPnl,
                  setter: setShowPnl,
                },
                {
                  key: "showTransactions",
                  label: "Show Transactions",
                  desc: "Show recent transaction history",
                  value: showTransactions,
                  setter: setShowTransactions,
                },
                {
                  key: "privacyMode",
                  label: "🔒 Privacy Mode",
                  desc: "Hide exact amounts — share only % return & badges",
                  value: privacyMode,
                  setter: setPrivacyMode,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => item.setter(!item.value)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      item.value ? "bg-blue-600" : "bg-accent"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        item.value ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Link Expiry
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["never", "24h", "7d", "30d"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setExpiresIn(opt)}
                    className={`py-2 text-sm rounded-lg border transition-colors ${
                      expiresIn === opt
                        ? "bg-blue-600/20 border-blue-600 text-blue-400"
                        : "border-border text-muted-foreground hover:border-border"
                    }`}
                  >
                    {opt === "never" ? "Never" : opt}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 px-3 py-2 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-foreground py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Share Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Existing Links */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Your Share Links ({shareLinks.length})
          </h2>

          {shareLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No share links yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shareLinks.map((link) => {
                const isExpired =
                  link.expiresAt && new Date(link.expiresAt) < new Date();
                return (
                  <div
                    key={link.id}
                    className={`border rounded-xl p-4 ${
                      isExpired
                        ? "border-border bg-muted/30 opacity-60"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-mono text-blue-400 truncate">
                            /share/{link.token.slice(0, 16)}...
                          </p>
                          {isExpired && (
                            <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full flex-shrink-0">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {link.config.privacyMode && <span className="text-blue-400">🔒 Privacy</span>}
                          {link.config.showCostBasis && <span>Cost basis</span>}
                          {link.config.showPnl && <span>P&L</span>}
                          {link.config.showTransactions && <span>Transactions</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {format(new Date(link.createdAt), "dd MMM yyyy")}
                          {link.expiresAt &&
                            ` · Expires ${format(new Date(link.expiresAt), "dd MMM yyyy")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isExpired && (
                          <ShareActions url={getShareUrl(link.token)} variant="compact" />
                        )}
                        <a
                          href={getShareUrl(link.token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
                          title="Open link"
                        >
                          <Share2 className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="p-2 text-muted-foreground hover:text-red-400 bg-muted hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

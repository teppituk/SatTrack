"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/nav";
import { useLocale } from "@/contexts/locale-context";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Trash2,
  Check,
  AlertCircle,
  User,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

type Profile = { name: string | null; email: string | null; image: string | null };

export default function ProfileSettingsPage() {
  const { status, update } = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // เปลี่ยนรหัสผ่าน
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Profile | null) => {
        if (d) {
          setProfile(d);
          setName(d.name ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [status]);

  const handleSaveName = async () => {
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to save");
        return;
      }
      setProfile((p) => (p ? { ...p, name: d.name } : p));
      await update(); // refresh session (name) ทั่วทั้งแอป
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to upload");
        return;
      }
      setProfile((p) => (p ? { ...p, image: d.image } : p));
      await update();
    } catch {
      setError("Failed to upload");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    setError("");
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      if (res.ok) {
        setProfile((p) => (p ? { ...p, image: null } : p));
        await update();
      }
    } catch {
      setError("Failed to remove");
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSaved(false);
    if (newPw.length < 8) {
      setPwError(t("settings.passwordHelp"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t("settings.passwordMismatch"));
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await res.json();
      if (!res.ok) {
        setPwError(d.error || "Failed to change password");
        return;
      }
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch {
      setPwError("Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      </AppShell>
    );
  }

  const initial = (profile?.name || profile?.email || "U")[0].toUpperCase();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("settings.backToSettings")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("settings.editProfile")}</h1>
            <p className="text-muted-foreground text-sm">{t("settings.editProfileDesc")}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Profile picture */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            {t("settings.profilePicture")}
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 flex-shrink-0">
              {profile?.image ? (
                <Image
                  src={profile.image}
                  alt="avatar"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-foreground text-2xl font-bold">
                  {initial}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePickFile}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  {profile?.image ? t("settings.changePhoto") : t("settings.uploadPhoto")}
                </button>
                {profile?.image && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 bg-muted hover:bg-accent disabled:opacity-60 text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("settings.removePhoto")}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t("settings.photoHelp")}</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {/* Personal info */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("settings.displayName")}
            </label>
            <input
              type="text"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.displayNamePlaceholder")}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t("settings.emailReadonly")}
            </label>
            <input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <button
            onClick={handleSaveName}
            disabled={isSaving || name.trim().length === 0 || name === (profile?.name ?? "")}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("settings.saving")}
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                {t("settings.saved")}
              </>
            ) : (
              t("settings.saveChanges")
            )}
          </button>
        </div>

        {/* Change password */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t("settings.changePassword")}
          </h2>

          {pwError && (
            <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 text-red-400 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {pwError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("settings.currentPassword")}
            </label>
            <input
              type={showPw ? "text" : "password"}
              value={curPw}
              autoComplete="current-password"
              onChange={(e) => setCurPw(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("settings.newPassword")}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={newPw}
                autoComplete="new-password"
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("settings.passwordHelp")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("settings.confirmPassword")}
            </label>
            <input
              type={showPw ? "text" : "password"}
              value={confirmPw}
              autoComplete="new-password"
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !curPw || !newPw || !confirmPw}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {pwSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("settings.saving")}
              </>
            ) : pwSaved ? (
              <>
                <Check className="h-4 w-4" />
                {t("settings.passwordChanged")}
              </>
            ) : (
              t("settings.updatePassword")
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

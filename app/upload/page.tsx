"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import { SlipUploadForm } from "@/components/slip-upload-form";
import { Bitcoin } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";

export default function UploadPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useLocale();

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

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Bitcoin className="h-5 w-5 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("upload.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("upload.subtitle")}</p>
        </div>

        {/* Input Form */}
        <div className="bg-card border border-border rounded-xl p-6">
          <SlipUploadForm
            onSuccess={() => {
              // Could show a toast notification here
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}

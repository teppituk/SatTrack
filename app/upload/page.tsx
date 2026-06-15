"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/nav";
import { SlipUploadForm } from "@/components/slip-upload-form";
import { Upload, Info } from "lucide-react";
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

  const tips = [
    {
      title: t("upload.tipClearImage"),
      desc: t("upload.tipClearImageDesc"),
    },
    {
      title: t("upload.tipFullSlip"),
      desc: t("upload.tipFullSlipDesc"),
    },
    {
      title: t("upload.tipReviewCarefully"),
      desc: t("upload.tipReviewCarefullyDesc"),
    },
  ];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("upload.title")}</h1>
          </div>
          <p className="text-gray-400">{t("upload.subtitle")}</p>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-950/30 border border-blue-800/50 rounded-xl p-4 mb-6">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-medium text-white mb-1">{t("upload.supportedExchanges")}</p>
            <p className="text-gray-400">{t("upload.supportedDesc")}</p>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <SlipUploadForm
            onSuccess={() => {
              // Could show a toast notification here
            }}
          />
        </div>

        {/* Tips */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tips.map((tip) => (
            <div
              key={tip.title}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4"
            >
              <p className="text-sm font-medium text-white mb-1">{tip.title}</p>
              <p className="text-xs text-gray-500">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

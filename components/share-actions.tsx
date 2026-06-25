"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, CheckCircle, QrCode, X } from "lucide-react";

interface ShareActionsProps {
  url: string;
  text?: string;
  // compact = icon-only row (for lists); full = larger buttons (for public page)
  variant?: "compact" | "full";
}

export function ShareActions({ url, text, variant = "full" }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const shareText = text || "Check out my Bitcoin stack on StackSat";
  const encUrl = encodeURIComponent(url);
  const encText = encodeURIComponent(shareText);

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encUrl}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encUrl}&text=${encText}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const open = (u: string) =>
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=600");

  const big = variant === "full";
  const btn = big
    ? "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
    : "p-2 rounded-lg transition-colors";

  return (
    <>
      <div className={big ? "flex flex-wrap gap-2" : "flex items-center gap-2"}>
        {/* LINE */}
        <button
          onClick={() => open(lineUrl)}
          title="แชร์ไป LINE"
          className={`${btn} bg-[#06C755] hover:bg-[#05b54d] text-white`}
        >
          <span className="font-bold text-xs">LINE</span>
          {big && <span>แชร์</span>}
        </button>
        {/* X */}
        <button
          onClick={() => open(xUrl)}
          title="แชร์ไป X"
          className={`${btn} bg-black hover:bg-gray-800 text-white border border-border`}
        >
          <span className="font-bold">𝕏</span>
          {big && <span>Post</span>}
        </button>
        {/* Facebook */}
        <button
          onClick={() => open(fbUrl)}
          title="แชร์ไป Facebook"
          className={`${btn} bg-[#1877F2] hover:bg-[#1466d6] text-white`}
        >
          <span className="font-bold text-xs">f</span>
          {big && <span>Share</span>}
        </button>
        {/* QR */}
        <button
          onClick={() => setShowQr(true)}
          title="แสดง QR code"
          className={`${btn} bg-muted hover:bg-accent text-foreground border border-border`}
        >
          <QrCode className="h-4 w-4" />
          {big && <span>QR</span>}
        </button>
        {/* Copy */}
        <button
          onClick={copy}
          title="คัดลอกลิงก์"
          className={`${btn} bg-muted hover:bg-accent text-foreground border border-border`}
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {big && <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>}
        </button>
      </div>

      {/* QR modal */}
      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">สแกนเพื่อดูพอร์ต</h3>
              <button
                onClick={() => setShowQr(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white rounded-xl p-4 flex items-center justify-center">
              <QRCodeSVG value={url} size={220} level="M" marginSize={4} />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3 break-all">
              {url}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

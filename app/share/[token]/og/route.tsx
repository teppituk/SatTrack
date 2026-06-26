import { ImageResponse } from "next/og";
import { loadShare, parseShareConfig, computeStats } from "@/lib/share";

// Route handler (nodejs) — Prisma + ImageResponse. Referenced from generateMetadata.
export const runtime = "nodejs";

// Strip non-Latin/emoji so satori doesn't fetch glyphs from a CDN.
function ascii(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[^\x00-\x7F]/g, "").trim();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let name = "A Bitcoiner";
  let returnPct = "";
  let sats = "";
  let badges: string[] = [];
  let positive = true;

  try {
    const data = await loadShare(token);
    if (data && !("expired" in data)) {
      const config = parseShareConfig(data.config);
      const stats = await computeStats(data.user.transactions);
      name = ascii(data.user.name || "") || "A Bitcoiner";
      positive = stats.totalPnlPercent >= 0;
      if (config.showPnl) {
        returnPct = `${positive ? "+" : ""}${stats.totalPnlPercent.toFixed(1)}%`;
      }
      if (!config.privacyMode && stats.satsStacked > 0) {
        sats = `${new Intl.NumberFormat("en-US").format(stats.satsStacked)} sats stacked`;
      }
      badges = stats.badges.slice(0, 3).map((b) => ascii(b.label));
    }
  } catch {
    // generic card fallback
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0a0a 0%, #15171c 100%)",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#f7931a",
              color: "#0a0a0a",
              fontSize: 38,
              fontWeight: 800,
              marginRight: 18,
            }}
          >
            B
          </div>
          <div style={{ color: "#f7931a", fontSize: 40, fontWeight: 700 }}>StackSats</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#9ca3af", fontSize: 34, marginBottom: 8 }}>
            {`${name}'s Bitcoin Stack`}
          </div>
          {returnPct ? (
            <div
              style={{
                color: positive ? "#34d399" : "#f87171",
                fontSize: 150,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {returnPct}
            </div>
          ) : (
            <div style={{ color: "#e5e7eb", fontSize: 92, fontWeight: 800 }}>
              Bitcoin Portfolio
            </div>
          )}
          {sats ? (
            <div style={{ color: "#d1d5db", fontSize: 40, marginTop: 12 }}>{sats}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {badges.map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  background: "#1f2937",
                  color: "#e5e7eb",
                  borderRadius: 9999,
                  padding: "12px 24px",
                  fontSize: 28,
                }}
              >
                {b}
              </div>
            ))}
          </div>
          <div style={{ color: "#6b7280", fontSize: 28 }}>track yours at StackSats</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

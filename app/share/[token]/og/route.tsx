import { ImageResponse } from "next/og";
import { loadShare, parseShareConfig, computeStats } from "@/lib/share";

// Route handler (nodejs) — Prisma + ImageResponse. Referenced from generateMetadata.
export const runtime = "nodejs";

// Strip non-Latin/emoji so satori doesn't fetch glyphs from a CDN.
function ascii(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[^\x00-\x7F]/g, "").trim();
}

const ORANGE = "#f7931a";
const GREEN = "#34d399";
const RED = "#f87171";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let name = "A Bitcoiner";
  let returnPct = "";
  let sats = "";
  let btc = "";
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
        sats = new Intl.NumberFormat("en-US").format(stats.satsStacked);
        btc = stats.btcAmount.toLocaleString("en-US", {
          maximumFractionDigits: stats.btcAmount >= 1 ? 4 : 8,
        });
      }
      badges = stats.badges.slice(0, 3).map((b) => ascii(b.label)).filter(Boolean);
    }
  } catch {
    // generic card fallback
  }

  const pill = {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 9999,
    padding: "10px 22px",
    color: "#e5e7eb",
    fontSize: 26,
  } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "58px 70px",
          background:
            "linear-gradient(135deg, #0a0a0d 0%, #161009 55%, #2a1907 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* decorative upward sparkline (background) */}
        <svg
          width="1200"
          height="260"
          viewBox="0 0 1200 260"
          style={{ position: "absolute", left: 0, bottom: 0 }}
        >
          <polygon
            points="0,210 150,196 300,205 450,150 600,165 750,110 900,120 1050,55 1200,40 1200,260 0,260"
            fill="rgba(247,147,26,0.10)"
          />
          <polyline
            points="0,210 150,196 300,205 450,150 600,165 750,110 900,120 1050,55 1200,40"
            fill="none"
            stroke={ORANGE}
            strokeWidth="5"
            strokeOpacity="0.65"
          />
        </svg>

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 76,
                height: 76,
                borderRadius: 76,
                background: ORANGE,
                color: "#0a0a0d",
                fontSize: 46,
                fontWeight: 800,
              }}
            >
              B
            </div>
            <div style={{ color: ORANGE, fontSize: 44, fontWeight: 800, marginLeft: 20 }}>
              KeepSats
            </div>
          </div>
          <div style={{ display: "flex", color: "#7b8190", fontSize: 26 }}>
            keepsats
          </div>
        </div>

        {/* Center */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#9aa0aa", fontSize: 36, marginBottom: 4 }}>
            {`${name}'s Bitcoin Stack`}
          </div>

          {returnPct ? (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "flex",
                  color: positive ? GREEN : RED,
                  fontSize: 168,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {returnPct}
              </div>
              <div style={{ display: "flex", color: "#6b7280", fontSize: 30, marginLeft: 20, marginBottom: 26 }}>
                total return
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", color: "#e5e7eb", fontSize: 100, fontWeight: 800 }}>
              Bitcoin Portfolio
            </div>
          )}

          {/* stat pills */}
          <div style={{ display: "flex", marginTop: 26 }}>
            {btc ? (
              <div style={{ ...pill, marginRight: 16 }}>
                <span style={{ color: ORANGE, fontWeight: 700, marginRight: 8 }}>BTC</span>
                {btc}
              </div>
            ) : null}
            {sats ? (
              <div style={pill}>
                {sats}
                <span style={{ color: "#7b8190", marginLeft: 8 }}>sats</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom: badges + footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex" }}>
            {badges.map((b) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  background: "rgba(247,147,26,0.12)",
                  border: "1px solid rgba(247,147,26,0.35)",
                  color: "#f3c07a",
                  borderRadius: 9999,
                  padding: "9px 20px",
                  fontSize: 24,
                  marginRight: 14,
                }}
              >
                {b}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", color: "#6b7280", fontSize: 26 }}>
            track yours at KeepSats
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

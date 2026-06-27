"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  Scatter,
  ZAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ResponsiveContainer,
} from "recharts";

interface Tx {
  id: string;
  type: "BUY" | "SELL";
  amount: number;
  price: number;
  totalValue: number;
  currency: string;
  txDate: string;
}

interface PricePoint {
  t: number; // ms
  p: number;
}

type Range = "1M" | "3M" | "1Y" | "5Y" | "ALL";
const RANGE_DAYS: Record<Range, number | null> = {
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "5Y": 1825,
  ALL: null,
};

interface BuySellChartProps {
  transactions: Tx[];
  priceHistory: PricePoint[];
  currency: "THB" | "USD";
  loading?: boolean;
}

const ORANGE = "#f59e0b";
const GREEN = "#34d399";
const GRAY = "#94a3b8";

export function BuySellChart({
  transactions,
  priceHistory,
  currency,
  loading,
}: BuySellChartProps) {
  const [range, setRange] = useState<Range>("ALL");
  const sym = currency === "USD" ? "$" : "฿"; // ฿ = baht; ₿ used for BTC below

  const money = (v: number, dp = 0) =>
    `${sym}${v.toLocaleString("en-US", { maximumFractionDigits: dp })}`;
  const fmtBtc = (v: number) =>
    v.toLocaleString("en-US", { maximumFractionDigits: v >= 1 ? 4 : 8 });
  const fmtAxisMoney = (v: number) =>
    v >= 1000 ? `${sym}${Math.round(v / 1000)}K` : `${sym}${Math.round(v)}`;
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // ── สถิติรวม (อิงทุกธุรกรรม) ──────────────────────────────
  const stats = useMemo(() => {
    let boughtAmt = 0,
      boughtCost = 0,
      soldAmt = 0,
      buyCount = 0;
    let firstBuy: number | null = null;
    for (const tx of transactions) {
      const ts = new Date(tx.txDate).getTime();
      if (tx.type === "BUY") {
        boughtAmt += tx.amount;
        boughtCost += tx.totalValue;
        buyCount++;
        if (firstBuy === null || ts < firstBuy) firstBuy = ts;
      } else {
        soldAmt += tx.amount;
      }
    }
    return {
      totalBtc: boughtAmt - soldAmt,
      avgCost: boughtAmt > 0 ? boughtCost / boughtAmt : 0,
      buyCount,
      firstBuy,
    };
  }, [transactions]);

  // ใช้ราคาตลาดถ้ามี; ถ้าดึงไม่ได้ (เช่น CoinGecko rate-limit) fallback เป็นราคาจากธุรกรรมเอง
  const series = useMemo<PricePoint[]>(() => {
    if (priceHistory.length > 0) return priceHistory;
    return transactions
      .map((t) => ({ t: new Date(t.txDate).getTime(), p: t.price }))
      .filter((p) => p.p > 0)
      .sort((a, b) => a.t - b.t);
  }, [priceHistory, transactions]);

  // ── ช่วงเวลาเริ่มต้นตาม range ─────────────────────────────
  const rangeStart = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === null) {
      const earliest = Math.min(
        series[0]?.t ?? Date.now(),
        stats.firstBuy ?? Date.now()
      );
      return earliest;
    }
    return Date.now() - days * 86400000;
  }, [range, series, stats.firstBuy]);

  // ── ข้อมูลเส้นราคา + ต้นทุนเฉลี่ยสะสม (stepped) ───────────
  const priceData = useMemo(() => {
    const buys = transactions
      .filter((t) => t.type === "BUY")
      .map((t) => ({ ts: new Date(t.txDate).getTime(), amt: t.amount, cost: t.totalValue }))
      .sort((a, b) => a.ts - b.ts);

    const pts = series.filter((p) => p.t >= rangeStart);
    let bi = 0,
      cumCost = 0,
      cumAmt = 0;
    return pts.map((pp) => {
      while (bi < buys.length && buys[bi].ts <= pp.t) {
        cumCost += buys[bi].cost;
        cumAmt += buys[bi].amt;
        bi++;
      }
      return {
        t: pp.t,
        price: pp.p,
        avgCost: cumAmt > 0 ? cumCost / cumAmt : null,
      };
    });
  }, [series, transactions, rangeStart]);

  // ราคา ณ เวลาใกล้เคียง (วาง bubble ให้อยู่บนเส้น)
  const priceAt = useMemo(() => {
    const sorted = [...series].sort((a, b) => a.t - b.t);
    return (ts: number) => {
      if (sorted.length === 0) return 0;
      let lo = 0,
        hi = sorted.length - 1,
        best = sorted[0];
      let bestD = Infinity;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const d = Math.abs(sorted[mid].t - ts);
        if (d < bestD) {
          bestD = d;
          best = sorted[mid];
        }
        if (sorted[mid].t < ts) lo = mid + 1;
        else hi = mid - 1;
      }
      return best.p;
    };
  }, [series]);

  const bubbles = useMemo(() => {
    const inRange = transactions.filter(
      (t) => new Date(t.txDate).getTime() >= rangeStart
    );
    const mk = (t: Tx) => ({
      t: new Date(t.txDate).getTime(),
      y: priceAt(new Date(t.txDate).getTime()) || t.price,
      z: Math.max(t.amount, 1e-9),
      amount: t.amount,
      total: t.totalValue,
      // ราคาที่ซื้อจริงต่อหน่วย (ให้ amount × buyPrice = total เสมอ)
      buyPrice: t.amount > 0 ? t.totalValue / t.amount : t.price,
      type: t.type,
    });
    return {
      buys: inRange.filter((t) => t.type === "BUY").map(mk),
      sells: inRange.filter((t) => t.type === "SELL").map(mk),
    };
  }, [transactions, rangeStart, priceAt]);

  const hasData = priceData.length > 0;

  return (
    <div>
      {/* Header สถิติ + ปุ่มช่วงเวลา */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Bitcoin Reserve
          </p>
          <p className="text-4xl font-bold text-foreground mt-1">
            ₿{fmtBtc(stats.totalBtc)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Avg cost: {money(stats.avgCost)}
            {stats.buyCount > 0 && (
              <>
                {" · "}
                {stats.buyCount} purchase{stats.buyCount !== 1 ? "s" : ""}
                {stats.firstBuy && (
                  <>
                    {" since "}
                    {new Date(stats.firstBuy).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-full p-1">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                range === r
                  ? "bg-orange-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "ALL" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* กราฟ */}
      {loading ? (
        <div className="h-[460px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : !hasData ? (
        <div className="h-[460px] flex items-center justify-center text-muted-foreground text-sm">
          ไม่มีข้อมูลราคา/ธุรกรรมในช่วงที่เลือก
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={460}>
          <ComposedChart data={priceData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="btcArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.18} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtDate}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              minTickGap={48}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtAxisMoney}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              width={56}
              tickLine={false}
              axisLine={false}
            />
            <ZAxis dataKey="z" range={[50, 800]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const find = (k: string) =>
                  payload.find((p) => p.dataKey === k)?.value as number | undefined;
                const price = find("price");
                const avg = find("avgCost");
                const bub = payload.find((p) => p.dataKey === "y")?.payload as
                  | { type: string; amount: number; total: number; buyPrice: number }
                  | undefined;
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                    <div className="text-muted-foreground mb-1">
                      {new Date(label as number).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    {price != null && (
                      <div className="text-foreground">
                        BTC: <b>{money(price, 0)}</b>
                      </div>
                    )}
                    {avg != null && (
                      <div style={{ color: GREEN }}>Avg cost: {money(avg, 0)}</div>
                    )}
                    {bub && (
                      <div
                        className="mt-1 pt-1 border-t border-border"
                        style={{ color: bub.type === "BUY" ? ORANGE : GRAY }}
                      >
                        {bub.type === "BUY" ? "● Purchase" : "● Sale"}:{" "}
                        <b>
                          {bub.amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} BTC
                        </b>{" "}
                        @ {money(bub.buyPrice, 0)} = {money(bub.total, 0)}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={ORANGE}
              strokeWidth={2}
              fill="url(#btcArea)"
              dot={false}
              isAnimationActive={false}
              name="BTC Price"
            />
            <Line
              type="stepAfter"
              dataKey="avgCost"
              stroke={GREEN}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
              name="Avg Cost Basis"
            />
            <Scatter
              data={bubbles.buys}
              dataKey="y"
              fill={ORANGE}
              fillOpacity={0.75}
              stroke={ORANGE}
              isAnimationActive={false}
              name="Purchase"
            />
            <Scatter
              data={bubbles.sells}
              dataKey="y"
              fill={GRAY}
              fillOpacity={0.7}
              stroke={GRAY}
              isAnimationActive={false}
              name="Sale"
            />
            <Brush
              dataKey="t"
              height={34}
              travellerWidth={8}
              stroke={ORANGE}
              tickFormatter={fmtDate}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-0.5" style={{ background: ORANGE }} /> BTC Price
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-5 h-0 border-t-2 border-dashed"
            style={{ borderColor: GREEN }}
          />{" "}
          Avg Cost Basis
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />{" "}
          Purchase event (size = BTC amount)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: GRAY }} />{" "}
          Sale event (size = BTC amount)
        </span>
      </div>
    </div>
  );
}

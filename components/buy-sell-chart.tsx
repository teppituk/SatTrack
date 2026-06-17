"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  IChartApi,
  ISeriesApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";

interface Transaction {
  id: string;
  type: "BUY" | "SELL";
  price: number;
  amount: number;
  totalValue: number;
  currency: string;
  txDate: string;
  coin: { symbol: string };
}

// 5 ขนาดตาม threshold มูลค่า
const TIERS = [
  { label: "เล็ก",      thbMax: 1_000,    usdMax: 30,       size: 1   },
  { label: "กลาง",      thbMax: 5_000,    usdMax: 153,      size: 2.5 },
  { label: "กลางใหญ่", thbMax: 10_000,   usdMax: 306,      size: 4   },
  { label: "ใหญ่",      thbMax: 100_000,  usdMax: 3_068,    size: 6   },
  { label: "ใหญ่มาก",  thbMax: Infinity, usdMax: Infinity, size: 9   },
] as const;

function getTier(totalValue: number, currency: string) {
  const isUSD = currency === "USD" || currency === "USDT";
  return (
    TIERS.find((t) => (isUSD ? totalValue < t.usdMax : totalValue < t.thbMax)) ??
    TIERS[TIERS.length - 1]
  );
}

interface BuySellChartProps {
  transactions: Transaction[];
  coinSymbol: string;
  priceHistory?: Array<{ time: number; open: number; high: number; low: number; close: number }>;
}

export function BuySellChart({ transactions, coinSymbol, priceHistory }: BuySellChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: "#3b82f6",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1d4ed8",
        },
        horzLine: {
          color: "#3b82f6",
          labelBackgroundColor: "#1d4ed8",
        },
      },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    const lineSeries = chart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    seriesRef.current = lineSeries;

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.txDate).getTime() - new Date(b.txDate).getTime()
    );

    // Build price line
    if (priceHistory && priceHistory.length > 0) {
      lineSeries.setData(priceHistory.map((p) => ({ time: p.time as Time, value: p.close })));
    } else if (sorted.length > 0) {
      const lineData = sorted.map((tx) => ({
        time: Math.floor(new Date(tx.txDate).getTime() / 1000) as Time,
        value: tx.price,
      }));
      const unique = lineData.filter(
        (item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time
      );
      if (unique.length > 0) lineSeries.setData(unique);
    }

    // Build markers — ไม่มี text (ซ่อนไว้แสดงเฉพาะตอน hover)
    if (sorted.length > 0) {
      const markers: SeriesMarker<Time>[] = sorted.map((tx) => {
        const tier = getTier(tx.totalValue, tx.currency);
        return {
          time: Math.floor(new Date(tx.txDate).getTime() / 1000) as Time,
          position: tx.type === "BUY" ? "belowBar" : "aboveBar",
          color: tx.type === "BUY" ? "#10b981" : "#ef4444",
          shape: "circle",
          text: "",   // ซ่อน label ทั้งหมด
          size: tier.size,
        };
      });
      lineSeries.setMarkers(markers);
    }

    chart.timeScale().fitContent();

    // ─── Hover Tooltip ───────────────────────────────────────────
    // สร้าง map: timestamp (วินาที) → transaction
    const txByTime = new Map<number, Transaction>();
    sorted.forEach((tx) => {
      txByTime.set(Math.floor(new Date(tx.txDate).getTime() / 1000), tx);
    });

    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      const container = chartContainerRef.current;
      if (!tooltip || !container) return;

      if (!param.point) {
        tooltip.style.display = "none";
        return;
      }

      const crosshairX = param.point.x;
      const crosshairY = param.point.y;

      // หา marker ที่ใกล้เคียง crosshair ที่สุดในหน่วย pixel
      let closest: Transaction | null = null;
      let minPixelDist = Infinity;
      txByTime.forEach((tx, t) => {
        const markerX = chart.timeScale().timeToCoordinate(t as Time);
        if (markerX === null) return;
        const dist = Math.abs(markerX - crosshairX);
        if (dist < minPixelDist) { minPixelDist = dist; closest = tx; }
      });

      // แสดง tooltip เฉพาะเมื่อ crosshair ห่างจาก marker ≤20px
      const PIXEL_THRESHOLD = 20;
      if (!closest || minPixelDist > PIXEL_THRESHOLD) {
        tooltip.style.display = "none";
        return;
      }

      const x = crosshairX;
      const y = crosshairY;

      const tx = closest as Transaction;
      const tier = getTier(tx.totalValue, tx.currency);
      const isBuy = tx.type === "BUY";
      const date = new Date(tx.txDate).toLocaleString("th-TH", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      tooltip.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${date}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="
            background:${isBuy ? "#052e16" : "#450a0a"};
            color:${isBuy ? "#4ade80" : "#f87171"};
            padding:1px 7px;border-radius:9999px;font-size:11px;font-weight:600
          ">${tx.type}</span>
          <span style="color:#fff;font-weight:600">${tx.coin.symbol}</span>
        </div>
        <div style="font-size:12px;color:#e2e8f0">
          จำนวน: <b>${tx.amount.toFixed(8).replace(/\.?0+$/, "")}</b>
        </div>
        <div style="font-size:12px;color:#e2e8f0">
          ราคา: <b>${tx.price.toLocaleString("th-TH")} ${tx.currency}</b>
        </div>
        <div style="font-size:13px;color:#fff;margin-top:4px;font-weight:700">
          มูลค่า: ${tx.totalValue.toLocaleString("th-TH")} ${tx.currency}
        </div>
        <div style="font-size:11px;color:${isBuy ? "#4ade80" : "#f87171"};margin-top:2px">
          ● ${tier.label}
        </div>
      `;

      // คำนวณตำแหน่ง tooltip ให้อยู่ในกรอบ chart
      const tw = 200;
      const th = 140;
      const left = x + tw + 12 > container.clientWidth ? x - tw - 8 : x + 12;
      const top  = y + th > container.clientHeight ? y - th : y;

      tooltip.style.display = "block";
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [transactions, priceHistory]);

  return (
    <div className="relative">
      {transactions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 text-gray-500">
          <div className="text-center">
            <p>No transactions for {coinSymbol}</p>
            <p className="text-sm mt-1">Upload slips to see your buy/sell points</p>
          </div>
        </div>
      )}

      <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden" />

      {/* Custom Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "absolute",
          pointerEvents: "none",
          zIndex: 20,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "10px",
          padding: "10px 14px",
          minWidth: "180px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
}

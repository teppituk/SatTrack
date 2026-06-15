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
  txDate: string;
  coin: { symbol: string };
}

interface BuySellChartProps {
  transactions: Transaction[];
  coinSymbol: string;
  priceHistory?: Array<{ time: number; open: number; high: number; low: number; close: number }>;
}

export function BuySellChart({ transactions, coinSymbol, priceHistory }: BuySellChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
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
      rightPriceScale: {
        borderColor: "#1e293b",
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    // Build line series from price history or transaction prices
    const lineSeries = chart.addLineSeries({
      color: "#3b82f6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    seriesRef.current = lineSeries;

    if (priceHistory && priceHistory.length > 0) {
      const lineData = priceHistory.map((p) => ({
        time: p.time as Time,
        value: p.close,
      }));
      lineSeries.setData(lineData);
    } else if (transactions.length > 0) {
      // Build interpolated line from transaction prices
      const sorted = [...transactions].sort(
        (a, b) => new Date(a.txDate).getTime() - new Date(b.txDate).getTime()
      );

      const lineData = sorted.map((tx) => ({
        time: Math.floor(new Date(tx.txDate).getTime() / 1000) as Time,
        value: tx.price,
      }));

      // Deduplicate timestamps
      const unique = lineData.filter(
        (item, idx, arr) => idx === 0 || item.time !== arr[idx - 1].time
      );

      if (unique.length > 0) {
        lineSeries.setData(unique);
      }
    }

    // Add buy/sell markers
    if (transactions.length > 0) {
      const sorted = [...transactions].sort(
        (a, b) => new Date(a.txDate).getTime() - new Date(b.txDate).getTime()
      );

      const markers: SeriesMarker<Time>[] = sorted.map((tx) => ({
        time: Math.floor(new Date(tx.txDate).getTime() / 1000) as Time,
        position: tx.type === "BUY" ? "belowBar" : "aboveBar",
        color: tx.type === "BUY" ? "#10b981" : "#ef4444",
        shape: tx.type === "BUY" ? "arrowUp" : "arrowDown",
        text: `${tx.type} ${tx.amount.toFixed(4)} @ ${tx.price.toLocaleString()}`,
        size: 1.5,
      }));

      lineSeries.setMarkers(markers);
    }

    chart.timeScale().fitContent();

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
    </div>
  );
}

"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];

interface PortfolioChartProps {
  data: Array<{
    symbol: string;
    currentValue: number;
    allocation: number;
  }>;
  currency?: string;
}

function formatCurrency(value: number, currency: string): string {
  if (currency === "THB") {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      symbol: string;
      currentValue: number;
      allocation: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold">{item.symbol}</p>
        <p className="text-gray-300 text-sm">
          {formatCurrency(item.currentValue, "THB")}
        </p>
        <p className="text-gray-400 text-sm">{item.allocation.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>;
}) => {
  if (!payload) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry, index) => (
        <li key={index} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-400 text-xs">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

export function PortfolioChart({
  data,
  currency = "THB",
}: PortfolioChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No portfolio data yet
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.symbol,
    value: item.currentValue,
    symbol: item.symbol,
    currentValue: item.currentValue,
    allocation: item.allocation,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              strokeWidth={0}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

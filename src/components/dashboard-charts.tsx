"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPalette = {
  grid: string;
  axis: string;
  teal: string;
  tealMid: string;
  blue: string;
  amber: string;
  tooltipBg: string;
  tooltipFg: string;
};

const FALLBACK: ChartPalette = {
  grid: "#e7e5e4",
  axis: "#78716c",
  teal: "#275850",
  tealMid: "#3b8a79",
  blue: "#2563eb",
  amber: "#d97706",
  tooltipBg: "#ffffff",
  tooltipFg: "#1c1917",
};

function readChartPalette(): ChartPalette {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);
  const rgb = (name: string, fallback: string) => {
    const raw = styles.getPropertyValue(name).trim();
    return raw ? `rgb(${raw})` : fallback;
  };
  return {
    grid: rgb("--chart-grid", FALLBACK.grid),
    axis: rgb("--chart-axis", FALLBACK.axis),
    teal: rgb("--accent", FALLBACK.teal),
    tealMid: "#3b8a79",
    blue: rgb("--chart-2", FALLBACK.blue),
    amber: rgb("--chart-3", FALLBACK.amber),
    tooltipBg: rgb("--chart-tooltip-bg", FALLBACK.tooltipBg),
    tooltipFg: rgb("--chart-tooltip-fg", FALLBACK.tooltipFg),
  };
}

function useChartPalette(): ChartPalette {
  const [palette, setPalette] = useState<ChartPalette>(FALLBACK);

  useEffect(() => {
    const sync = () => setPalette(readChartPalette());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return palette;
}

export function DailySalesChart({
  data,
  emptyLabel,
  seriesLabel,
}: {
  data: { date: string; netSales: number }[];
  emptyLabel: string;
  seriesLabel: string;
}) {
  const palette = useChartPalette();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-fg-subtle">{emptyLabel}</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="judiSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette.teal} stopOpacity={0.35} />
              <stop offset="95%" stopColor={palette.teal} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={palette.axis} />
          <YAxis tick={{ fontSize: 11 }} stroke={palette.axis} width={56} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: palette.grid,
              backgroundColor: palette.tooltipBg,
              color: palette.tooltipFg,
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: palette.axis }}
          />
          <Area
            type="monotone"
            dataKey="netSales"
            name={seriesLabel}
            stroke={palette.teal}
            fill="url(#judiSales)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({
  data,
  emptyLabel,
  seriesLabel,
}: {
  data: { name: string; revenue: number }[];
  emptyLabel: string;
  seriesLabel: string;
}) {
  const palette = useChartPalette();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-fg-subtle">{emptyLabel}</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke={palette.axis} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 11 }}
            stroke={palette.axis}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: palette.grid,
              backgroundColor: palette.tooltipBg,
              color: palette.tooltipFg,
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: palette.axis }}
          />
          <Bar dataKey="revenue" name={seriesLabel} fill={palette.blue} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

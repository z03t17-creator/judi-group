"use client";

import dynamic from "next/dynamic";

const chartSkeleton = (
  <div className="h-56 animate-pulse rounded-xl bg-muted" aria-hidden />
);

export const DailySalesChart = dynamic(
  () =>
    import("@/components/dashboard-charts").then((mod) => mod.DailySalesChart),
  { ssr: false, loading: () => chartSkeleton },
);

export const TopProductsChart = dynamic(
  () =>
    import("@/components/dashboard-charts").then((mod) => mod.TopProductsChart),
  { ssr: false, loading: () => chartSkeleton },
);

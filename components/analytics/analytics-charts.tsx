"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatPriceInRWF } from "@/lib/utils";
import { ChartErrorBoundary } from "./chart-error-boundary";

const starterConfig = {
  orders: {
    label: "Orders",
    theme: {
      light: "var(--chart-1)",
      dark: "var(--chart-1)",
    },
  },
};

const growthConfig = {
  revenue: {
    label: "Revenue (RWF)",
    theme: {
      light: "var(--chart-2)",
      dark: "var(--chart-2)",
    },
  },
};

const proConfig = {
  revenue: {
    label: "Revenue (RWF)",
    theme: {
      light: "var(--chart-3)",
      dark: "var(--chart-3)",
    },
  },
};

// const proPlusConfig = {
//   revenue: {
//     label: "Revenue (RWF)",
//     theme: {
//       light: "var(--chart-4)",
//       dark: "var(--chart-4)",
//     },
//   },
// };

export type StarterAnalyticsPoint = { day: string; orders: number };

export function StarterAnalyticsChart({
  data,
}: {
  data: StarterAnalyticsPoint[];
}) {
  return (
    <ChartErrorBoundary>
      <ChartContainer
        config={starterConfig}
        className="mt-4 h-[200px] sm:h-[250px] aspect-auto!"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              opacity={0.3}
            />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={28}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel indicator="line" />}
              cursor={{
                stroke: "var(--color-orders)",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="var(--color-orders)"
              fill="var(--color-orders)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartErrorBoundary>
  );
}

export type RevenuePoint = { label: string; revenue: number };

export function GrowthAnalyticsChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ChartErrorBoundary>
      <ChartContainer
        config={growthConfig}
        className="mt-4 h-[200px] sm:h-[250px] aspect-auto!"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              opacity={0.3}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 12 }}
              tickFormatter={value => `${(value / 1000).toFixed(0)}K`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  indicator="line"
                  formatter={value => formatPriceInRWF(Number(value))}
                />
              }
              cursor={{
                stroke: "var(--color-revenue)",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              fill="var(--color-revenue)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartErrorBoundary>
  );
}

export function ProAnalyticsChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ChartErrorBoundary>
      <ChartContainer
        config={proConfig}
        className="mt-4 h-[200px] sm:h-[250px] aspect-auto!"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              opacity={0.3}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 12 }}
              tickFormatter={value => `${(value / 1000).toFixed(0)}K`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  indicator="line"
                  formatter={value => formatPriceInRWF(Number(value))}
                />
              }
              cursor={{
                stroke: "var(--color-revenue)",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              fill="var(--color-revenue)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartErrorBoundary>
  );
}

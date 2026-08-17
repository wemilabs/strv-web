"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type DateRange, DateRangeSelector } from "./date-range-selector";

interface AnalyticsWrapperProps {
  children: React.ReactNode;
}

export function AnalyticsWrapper({ children }: AnalyticsWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange =
    (parseInt(searchParams.get("days") || "28", 10) as DateRange) || 28;

  const handleRangeChange = (range: DateRange) => {
    const params = new URLSearchParams(searchParams);
    params.set("days", range.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DateRangeSelector value={currentRange} onChange={handleRangeChange} />
      </div>
      {children}
    </div>
  );
}

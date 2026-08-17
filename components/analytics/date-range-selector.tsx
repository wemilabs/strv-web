"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DateRange = 7 | 14 | 28;

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const dateRanges: { value: DateRange; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 28, label: "28 days" },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Calendar className="size-4 text-muted-foreground ml-2" />
      {dateRanges.map(range => (
        <Button
          key={range.value}
          variant={value === range.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(range.value)}
          className="h-7 px-3 text-xs"
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}

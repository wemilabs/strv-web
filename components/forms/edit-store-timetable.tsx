"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DAYS, DEFAULT_HOURS } from "@/lib/constants";
import { updateStoreTimetable } from "@/server/stores";
import { ScrollArea } from "../ui/scroll-area";
import { Spinner } from "../ui/spinner";

export type DayTimetable = {
  open: string;
  close: string;
  closed: boolean;
};

export type TimetableData = Record<string, DayTimetable>;

type EditStoreTimetableProps = {
  storeId: string;
  storeSlug: string;
  initialTimetable?: TimetableData;
  onSuccessAction?: () => void;
};

export function EditStoreTimetable({
  storeId,
  storeSlug,
  initialTimetable,
  onSuccessAction,
}: EditStoreTimetableProps) {
  const [timetable, setTimetable] = useState<TimetableData>(() => {
    const defaultTimetable: TimetableData = {};
    for (const day of DAYS) {
      defaultTimetable[day.key] = initialTimetable?.[day.key] || DEFAULT_HOURS;
    }
    return defaultTimetable;
  });

  const formRef = useRef<HTMLFormElement>(null);
  const timetableRef = useRef(timetable);

  useEffect(() => {
    timetableRef.current = timetable;
  }, [timetable]);

  const [state, action, isPending] = useActionState(
    async (_prev: { success: boolean; message: string } | null) => {
      try {
        await updateStoreTimetable(storeId, storeSlug, timetableRef.current);
        toast.success("Done!", {
          description: "Timetable updated successfully",
        });
        return { success: true, message: "Timetable updated successfully" };
      } catch {
        toast.error("Failed!", { description: "Timetable update failed" });
        return { success: false, message: "Failed to update timetable" };
      }
    },
    null,
  );

  useEffect(() => {
    if (state?.success) {
      onSuccessAction?.();
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.reset();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, onSuccessAction]);

  const handleDayToggle = (dayKey: string, checked: boolean) => {
    setTimetable(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], closed: !checked },
    }));
  };

  const handleTimeChange = (
    dayKey: string,
    field: "open" | "close",
    value: string,
  ) => {
    setTimetable(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  const copyToAll = (sourceDayKey: string) => {
    const sourceDay = timetable[sourceDayKey];
    const newTimetable: TimetableData = {};
    for (const day of DAYS) {
      newTimetable[day.key] = { ...sourceDay };
    }
    setTimetable(newTimetable);
  };

  return (
    <ScrollArea className="h-[300px]">
      <form ref={formRef} action={action} className="space-y-4">
        {DAYS.map(day => {
          const dayData = timetable[day.key];
          const isOpen = !dayData.closed;

          return (
            <div
              key={day.key}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Switch
                  id={`${day.key}-toggle`}
                  checked={isOpen}
                  onCheckedChange={checked => handleDayToggle(day.key, checked)}
                />
                <Label
                  htmlFor={`${day.key}-toggle`}
                  className="min-w-[100px] cursor-pointer font-medium"
                >
                  {day.label}
                </Label>
              </div>

              {isOpen ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${day.key}-open`}
                      className="text-sm text-muted-foreground"
                    >
                      Open
                    </Label>
                    <Input
                      id={`${day.key}-open`}
                      type="time"
                      value={dayData.open}
                      onChange={e =>
                        handleTimeChange(day.key, "open", e.target.value)
                      }
                      className="w-[130px]"
                    />
                  </div>

                  <span className="text-muted-foreground">-</span>

                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${day.key}-close`}
                      className="text-sm text-muted-foreground"
                    >
                      Close
                    </Label>
                    <Input
                      id={`${day.key}-close`}
                      type="time"
                      value={dayData.close}
                      onChange={e =>
                        handleTimeChange(day.key, "close", e.target.value)
                      }
                      className="w-[130px]"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToAll(day.key)}
                    className="text-xs"
                  >
                    Copy to all
                  </Button>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          );
        })}

        <div className="flex items-center justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Spinner />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Timetable
              </>
            )}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}

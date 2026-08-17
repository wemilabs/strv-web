"use client";

import { Building2, Clock } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONES } from "@/lib/constants";
import { updateStoreTimezone } from "@/server/stores";
import { Spinner } from "../ui/spinner";

interface StoreSettingsProps {
  orgId: string;
  orgSlug: string;
  initialTimezone: string;
}

export function StoreSettings({
  orgId,
  orgSlug,
  initialTimezone,
}: StoreSettingsProps) {
  const [selectedTimezone, setSelectedTimezone] =
    useState<string>(initialTimezone);

  const [state, formAction, isPending] = useActionState(updateStoreTimezone, {
    success: false,
    error: null,
  });

  const handleAutoDetect = () => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(browserTimezone);
  };

  return (
    <div className="border rounded-lg p-6 space-y-2">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Building2 className="size-4" />
          <h2 className="text-lg font-medium">Store Timezone</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4 font-mono tracking-tighter">
          Set your store timezone for accurate analytics and reporting.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="storeId" value={orgId} />
        <input type="hidden" name="storeSlug" value={orgSlug} />
        <input type="hidden" name="timezone" value={selectedTimezone} />

        <div className="space-y-3">
          <div>
            <label htmlFor="current-timezone" className="text-sm font-medium">
              Current Timezone
            </label>
            <p
              id="current-timezone"
              className="text-sm text-muted-foreground font-mono tracking-tighter"
            >
              {TIMEZONES.find(tz => tz.value === initialTimezone)?.label}
            </p>
          </div>

          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoDetect}
              className="gap-2"
            >
              <Clock className="size-3" />
              Auto-detect
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={
                isPending ||
                !selectedTimezone ||
                selectedTimezone === initialTimezone
              }
            >
              {isPending ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          {state.success && (
            <p className="text-sm text-green-600">
              Timezone updated successfully!
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

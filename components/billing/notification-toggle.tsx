"use client";

import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function NotificationToggle() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported || isLoading) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const result = await unsubscribe();
      if (result.success) {
        toast.success("Notifications disabled");
      }
    } else {
      const result = await subscribe();
      if (result.success) {
        toast.success(
          "Notifications enabled! You'll receive renewal reminders.",
        );
      } else if (result.error === "Permission denied") {
        toast.error("Please enable notifications in your browser settings");
      } else {
        toast.error("Failed to enable notifications");
      }
    }
  };

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
    >
      {isSubscribed ? (
        <>
          <BellRing className="size-4" />
          Notifications On
        </>
      ) : (
        <>
          <Bell className="size-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
}

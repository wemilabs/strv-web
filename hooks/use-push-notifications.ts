"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/server/push-notifications";

export function usePushNotifications() {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if push is supported
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Check existing subscription
    navigator.serviceWorker.ready
      .then(registration => {
        return registration.pushManager.getSubscription();
      })
      .then(sub => {
        setIsSubscribed(!!sub);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const subscribe = async () => {
    if (!session?.user || !isSupported) {
      return { success: false, error: "Not supported or not logged in" };
    }

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        return { success: false, error: "Permission denied" };
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        return { success: false, error: "Push notifications not configured" };
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Get subscription keys
      const p256dhKey = subscription.getKey("p256dh");
      const authKey = subscription.getKey("auth");
      if (!p256dhKey || !authKey) {
        return { success: false, error: "Failed to get subscription keys" };
      }

      // Send subscription to server
      const result = await subscribeToPush({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey),
        },
      });

      if (result.success) {
        setIsSubscribed(true);
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error("Push subscription failed:", error);
      return { success: false, error: "Subscription failed" };
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return { success: false };

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeFromPush(subscription.endpoint);
      }

      setIsSubscribed(false);
      return { success: true };
    } catch (error) {
      console.error("Unsubscribe failed:", error);
      return { success: false };
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

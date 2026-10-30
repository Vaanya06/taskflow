"use client";

import { useEffect } from "react";

export default function PresenceHeartbeat() {
  useEffect(() => {
    let requestInFlight = false;

    async function sendHeartbeat() {
      if (document.visibilityState !== "visible" || requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch("/api/presence/heartbeat", {
          method: "POST",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Presence heartbeat returned ${response.status}.`);
        }
      } catch (error) {
        console.warn("Presence heartbeat failed; employee status may be stale.", error);
      } finally {
        requestInFlight = false;
      }
    }

    void sendHeartbeat();
    const interval = window.setInterval(() => void sendHeartbeat(), 30_000);
    document.addEventListener("visibilitychange", sendHeartbeat);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sendHeartbeat);
    };
  }, []);

  return null;
}

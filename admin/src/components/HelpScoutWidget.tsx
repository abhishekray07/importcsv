"use client";

import { useEffect } from "react";

// Define types for the Help Scout Beacon
interface BeaconQueueItem {
  method: string;
  options?: unknown;
  data?: unknown;
}

declare global {
  interface Window {
    Beacon: ((method: string, options?: unknown, data?: unknown) => void) & {
      readyQueue: BeaconQueueItem[];
    };
  }
}

export function HelpScoutWidget() {
  useEffect(() => {
    // Initialize Help Scout Beacon
    if (typeof window !== "undefined") {
      window.Beacon = function(method: string, options?: unknown, data?: unknown) {
        window.Beacon.readyQueue.push({ method, options, data });
      } as Window["Beacon"];

      window.Beacon.readyQueue = [];

      // Load the Beacon script
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = "https://beacon-v2.helpscout.net";
      document.head.appendChild(script);

      // Initialize Beacon once the script is loaded
      script.onload = () => {
        window.Beacon("init", "e928f89b-498b-4867-beb8-55676952b577");
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
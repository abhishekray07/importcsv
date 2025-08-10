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
    // Only load HelpScout in production
    if (process.env.NODE_ENV !== 'production') {
      if (process.env.NODE_ENV === 'development') {
        console.log('HelpScout: Skipping initialization in development');
      }
      return;
    }

    // Initialize Help Scout Beacon with error handling
    if (typeof window !== "undefined") {
      try {
        window.Beacon = function(method: string, options?: unknown, data?: unknown) {
          window.Beacon.readyQueue.push({ method, options, data });
        } as Window["Beacon"];

        window.Beacon.readyQueue = [];

        // Load the Beacon script
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = "https://beacon-v2.helpscout.net";
        
        // Add error handling for script loading
        script.onerror = () => {
          console.error("Failed to load HelpScout Beacon");
        };

        // Initialize Beacon once the script is loaded
        script.onload = () => {
          try {
            window.Beacon("init", "e928f89b-498b-4867-beb8-55676952b577");
          } catch (error) {
            console.error("Failed to initialize HelpScout Beacon:", error);
          }
        };

        document.head.appendChild(script);

        // Cleanup function to remove script on unmount
        return () => {
          const existingScript = document.querySelector('script[src="https://beacon-v2.helpscout.net"]');
          if (existingScript) {
            existingScript.remove();
          }
        };
      } catch (error) {
        console.error("Error setting up HelpScout:", error);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}
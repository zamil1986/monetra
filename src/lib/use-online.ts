"use client";
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/** PRD 5.5: recording needs a connection, so forms check this before saving. */
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

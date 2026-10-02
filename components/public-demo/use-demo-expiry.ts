"use client";
import { useEffect, useEffectEvent } from "react";

/** Mutations do not extend a practice session. Reset and scenario changes restart it. */
export function useDemoExpiry(duration: number, sessionKey: string, onExpire: () => void) {
  const expire = useEffectEvent(onExpire);
  useEffect(() => {
    const timer = window.setTimeout(() => expire(), duration);
    return () => window.clearTimeout(timer);
  }, [duration, sessionKey]);
}

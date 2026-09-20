"use client";

import { useEffect } from "react";
import { ensureServiceWorker, syncPushIfGranted } from "@/lib/push-client";

/** Register SW early; re-bind push when permission was already granted. */
export function PushBootstrap() {
  useEffect(() => {
    void ensureServiceWorker().catch(() => {
      /* insecure context or unsupported browser */
    });
    void syncPushIfGranted();
  }, []);

  return null;
}

import { LOCK_REASONS } from "@common/analytics/properties"
import { log } from "@common/log"

import { sessionStorage } from "../../util/sessionStorageCompat"
import type { LockFact, LockReason } from "../app/store.password"
import { analyticsLifecycleStore } from "./store.lifecycle"
import { track } from "./track"

const isLockReason = (value: unknown): value is LockReason =>
  LOCK_REASONS.includes(value as LockReason)

export const onInstalledForAnalytics = async ({
  reason,
  previousVersion,
}: chrome.runtime.InstalledDetails) => {
  if (reason === "install") {
    await analyticsLifecycleStore.set({ installedAt: Date.now() })
    track("app_installed")
  } else if (reason === "update" && previousVersion) {
    track("app_updated", { previous_version: previousVersion })
  }
}

const reportLockFact = async (fact: LockFact) => {
  if (fact.type === "locked") {
    await sessionStorage.set({ analyticsLastLockReason: fact.reason })
    track("app_locked", { reason: fact.reason })
    return
  }
  const stored = await sessionStorage.get("analyticsLastLockReason")
  track("app_unlocked", {
    method: fact.how.method,
    lock_reason: isLockReason(stored) ? stored : "restart",
    legacy_password: fact.how.legacyPassword,
  })
}

let reported = Promise.resolve()

export const onLockFact = (fact: LockFact) => {
  reported = reported
    .then(() => reportLockFact(fact))
    .catch((cause) => log.error("[analytics] lock fact failed", { cause }))
}

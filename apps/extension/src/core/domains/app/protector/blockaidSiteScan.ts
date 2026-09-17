import { BLOCKAID_API_URL } from "@common/constants"
import { combineLatest, Subject } from "rxjs"
import { z } from "zod"

import { gandalfFetch } from "../../gandalf/fetch"
import { remoteConfigStore } from "../store.remoteConfig"
import { settingsStore } from "../store.settings"
import { tryConsumeScanQuota } from "./blockaidScanQuota"
import { isExemptHost } from "./ParaverseProtector"

const MINUTE = 60_000
const MAX_VERDICT_TTL = MINUTE
const SCAN_TIMEOUT = 8_000
const MAX_CONSECUTIVE_FAILURES = 3
const PAUSE_AFTER_FAILURES = 10 * MINUTE
const NON_PUBLIC_TLDS = new Set(["localhost", "local", "test"])

const scanResultSchema = z
  .object({
    status: z.enum(["hit", "miss", "error"]),
    isMalicious: z.boolean(),
    ttlSeconds: z.number().finite(),
  })
  .refine((result) => !result.isMalicious || result.status === "hit")

type Verdict = { isMalicious: boolean; expiresAt: number }

export const maliciousOrigin$ = new Subject<string>()

const verdicts = new Map<string, Verdict>()
const scanningHosts = new Set<string>()
let isEnabled = false
let consecutiveFailures = 0
let pausedUntil = 0

combineLatest([remoteConfigStore.observable, settingsStore.observable]).subscribe({
  next: ([config, settings]) => {
    isEnabled = config.featureFlags.BLOCKAID_DAPP_SCAN === true && settings.autoRiskScan === true
  },
  error: () => {
    isEnabled = false
  },
})

function getVerdict(host: string): Verdict | undefined {
  const verdict = verdicts.get(host)
  return verdict && verdict.expiresAt > Date.now() ? verdict : undefined
}

function setVerdict(host: string, isMalicious: boolean, ttl: number): void {
  const now = Date.now()
  for (const [key, verdict] of verdicts) if (verdict.expiresAt <= now) verdicts.delete(key)
  verdicts.set(host, { isMalicious, expiresAt: now + Math.min(MAX_VERDICT_TTL, Math.max(0, ttl)) })
}

export function isBlockaidMalicious(host: string): boolean {
  return isEnabled && !isExemptHost(host) && getVerdict(host)?.isMalicious === true
}

function pauseScans(): void {
  pausedUntil = Date.now() + PAUSE_AFTER_FAILURES
}

function canScan(host: string): boolean {
  return isEnabled && pausedUntil <= Date.now() && !isExemptHost(host) && !getVerdict(host)
}

function isPublicWebUrl({ protocol, hostname }: URL): boolean {
  if (protocol !== "http:" && protocol !== "https:") return false
  const labels = hostname.replace(/\.$/, "").split(".")
  const tld = labels.at(-1) ?? ""
  const isIpAddress = /^\d+$/.test(tld) || hostname.includes(":")
  return labels.length > 1 && !isIpAddress && !NON_PUBLIC_TLDS.has(tld)
}

async function requestScan(origin: string, signal: AbortSignal) {
  const response = await gandalfFetch(`${BLOCKAID_API_URL}/site/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: origin }),
    signal,
  })
  if (response.status === 429) pauseScans()
  if (response.status !== 200) throw new Error("Site scan failed")
  return scanResultSchema.parse(await response.json())
}

async function requestScanWithTimeout(origin: string) {
  const controller = new AbortController()
  const timeout = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("Site scan timed out")))
  })
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT)
  try {
    // the race also bounds the Gandalf token wait, which the signal cannot interrupt
    return await Promise.race([requestScan(origin, controller.signal), timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function scan({ origin, hostname }: URL): Promise<void> {
  if (!(await tryConsumeScanQuota()) || !canScan(hostname)) return

  const result = await requestScanWithTimeout(origin).catch(() => undefined)

  if (result && result.status !== "error") consecutiveFailures = 0
  else if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) pauseScans()

  // failures are cached as safe: scans fail open and must not retry on every message
  const ttl = result ? result.ttlSeconds * 1_000 : MAX_VERDICT_TTL
  setVerdict(hostname, result?.isMalicious === true, ttl)
  if (isBlockaidMalicious(hostname)) maliciousOrigin$.next(origin)
}

export function requestSiteScan(rawUrl: string): void {
  if (!URL.canParse(rawUrl)) return
  const url = new URL(rawUrl)
  const host = url.hostname
  if (!isPublicWebUrl(url) || !canScan(host) || scanningHosts.has(host)) return

  scanningHosts.add(host)
  scan(url)
    .catch(() => {})
    .finally(() => scanningHosts.delete(host))
}

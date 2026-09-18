import { BLOCKAID_API_URL } from "@common/constants"
import { combineLatest, Subject } from "rxjs"
import { z } from "zod"

import { gandalfFetch } from "../../gandalf/fetch"
import { remoteConfigStore } from "../store.remoteConfig"
import { settingsStore } from "../store.settings"
import { isExemptHost } from "./ParaverseProtector"

const VERDICT_TTL = 60_000
const FAILED_SCAN_TTL = 5_000
const NON_PUBLIC_TLDS = new Set(["localhost", "local", "test"])

const scanResultSchema = z.object({ isMalicious: z.boolean() })

type Verdict = { isMalicious: boolean; expiresAt: number }

export const maliciousOrigin$ = new Subject<string>()

const verdicts = new Map<string, Verdict>()
let isEnabled = false

combineLatest([remoteConfigStore.observable, settingsStore.observable]).subscribe({
  next: ([config, settings]) => {
    isEnabled =
      config.featureFlags.BLOCKAID_DAPP_SCAN_V2 === true && settings.autoDappScan !== false
  },
  error: () => {
    isEnabled = false
  },
})

function getVerdict(host: string): Verdict | undefined {
  const verdict = verdicts.get(host)
  return verdict && verdict.expiresAt > Date.now() ? verdict : undefined
}

function setVerdict(host: string, isMalicious: boolean, ttl = VERDICT_TTL): void {
  const now = Date.now()
  for (const [key, verdict] of verdicts) if (verdict.expiresAt <= now) verdicts.delete(key)
  verdicts.set(host, { isMalicious, expiresAt: now + ttl })
}

export function isBlockaidMalicious(host: string): boolean {
  return isEnabled && !isExemptHost(host) && getVerdict(host)?.isMalicious === true
}

function isPublicWebUrl({ protocol, hostname }: URL): boolean {
  if (protocol !== "http:" && protocol !== "https:") return false
  const labels = hostname.replace(/\.$/, "").split(".")
  const tld = labels.at(-1) ?? ""
  const isIpAddress = /^\d+$/.test(tld) || hostname.includes(":")
  return labels.length > 1 && !isIpAddress && !NON_PUBLIC_TLDS.has(tld)
}

async function fetchIsMalicious(origin: string): Promise<boolean> {
  const response = await gandalfFetch(`${BLOCKAID_API_URL}/site/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: origin }),
  })
  if (!response.ok) throw new Error("Site scan failed")
  return scanResultSchema.parse(await response.json()).isMalicious
}

async function scan({ origin, hostname }: URL): Promise<void> {
  // safe until proven malicious: scans fail open, and the entry stops concurrent scans of the host
  setVerdict(hostname, false)

  try {
    if (!(await fetchIsMalicious(origin))) return

    setVerdict(hostname, true)
    if (isBlockaidMalicious(hostname)) maliciousOrigin$.next(origin)
  } catch {
    // a failed scan expires fast, so the next message retries instead of trusting the host for a minute
    setVerdict(hostname, false, FAILED_SCAN_TTL)
  }
}

export function requestSiteScan(rawUrl: string): void {
  if (!isEnabled || !URL.canParse(rawUrl)) return

  const url = new URL(rawUrl)
  if (!isPublicWebUrl(url) || isExemptHost(url.hostname) || getVerdict(url.hostname)) return

  void scan(url)
}

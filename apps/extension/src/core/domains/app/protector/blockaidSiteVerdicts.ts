import { BLOCKAID_API_URL } from "@common/constants"
import { combineLatest, Subject } from "rxjs"
import { z } from "zod"

import { gandalfFetch } from "../../gandalf/fetch"
import { remoteConfigStore } from "../store.remoteConfig"
import { settingsStore } from "../store.settings"
import { isExemptHost } from "./ParaverseProtector"

const MINUTE = 60_000
const MAX_VERDICT_TTL = MINUTE
const SCAN_TIMEOUT = 8_000
const MAX_SCANS_PER_MINUTE = 10
const MAX_SCANS_PER_DAY = 100
const BREAKER_FAILURE_THRESHOLD = 3
const BREAKER_TTL = 10 * MINUTE
const BUDGET_STORAGE_KEY = "blockaidSiteScanBudget"
const NON_PUBLIC_TLDS = new Set(["localhost", "local", "test"])

const budgetSchema = z.object({
  day: z.string(),
  count: z.number().int().nonnegative(),
  recent: z.array(z.number().finite()),
})
const resultSchema = z
  .object({
    status: z.enum(["hit", "miss", "error"]),
    isMalicious: z.boolean(),
    ttlSeconds: z.number().finite(),
  })
  .refine((result) => !result.isMalicious || result.status === "hit")

type Verdict = { isMalicious: boolean; expiresAt: number }
type Budget = z.infer<typeof budgetSchema>

export const maliciousOrigin$ = new Subject<string>()

const verdicts = new Map<string, Verdict>()
const inFlight = new Set<string>()
let budget: Budget = { day: "", count: 0, recent: [] }
let enabled = false
let failures = 0
let blockedUntil = 0
let hydration: Promise<void> | undefined

combineLatest([remoteConfigStore.observable, settingsStore.observable]).subscribe({
  next: ([config, settings]) => {
    enabled = config.featureFlags.BLOCKAID_DAPP_SCAN === true && settings.autoRiskScan === true
  },
  error: () => {
    enabled = false
  },
})

function getFreshVerdict(host: string): Verdict | undefined {
  const verdict = verdicts.get(host)
  return verdict && verdict.expiresAt > Date.now() ? verdict : undefined
}

export function isBlockaidMalicious(host: string): boolean {
  return enabled && !isExemptHost(host) && getFreshVerdict(host)?.isMalicious === true
}

function canScan(host: string): boolean {
  return enabled && blockedUntil <= Date.now() && !isExemptHost(host) && !getFreshVerdict(host)
}

function isPublicWebUrl({ protocol, hostname }: URL): boolean {
  if (protocol !== "http:" && protocol !== "https:") return false
  const labels = hostname.replace(/\.$/, "").split(".")
  const tld = labels.at(-1) ?? ""
  const isIpAddress = /^\d+$/.test(tld) || hostname.includes(":")
  return labels.length > 1 && !isIpAddress && !NON_PUBLIC_TLDS.has(tld)
}

function hydrateBudget(): Promise<void> {
  hydration ??= (async () => {
    const stored = await chrome.storage.local.get(BUDGET_STORAGE_KEY)
    const parsed = budgetSchema.safeParse(stored[BUDGET_STORAGE_KEY])
    if (parsed.success) budget = parsed.data
  })()
  return hydration
}

function reserveBudget(): boolean {
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  if (budget.day !== day) budget = { day, count: 0, recent: budget.recent }
  budget.recent = budget.recent.filter((time) => time > now - MINUTE)
  if (budget.count >= MAX_SCANS_PER_DAY || budget.recent.length >= MAX_SCANS_PER_MINUTE)
    return false
  budget.count++
  budget.recent.push(now)
  return true
}

async function requestVerdict(origin: string, signal: AbortSignal) {
  const response = await gandalfFetch(`${BLOCKAID_API_URL}/site/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: origin }),
    signal,
  })
  if (response.status === 429) blockedUntil = Date.now() + BREAKER_TTL
  if (response.status !== 200) throw new Error("Site scan failed")
  return resultSchema.parse(await response.json())
}

async function fetchVerdict(origin: string) {
  const controller = new AbortController()
  const timeout = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(new Error("Site scan timed out")))
  })
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT)
  try {
    // the race also bounds the Gandalf token wait, which the signal cannot interrupt
    return await Promise.race([requestVerdict(origin, controller.signal), timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function scan(url: URL): Promise<void> {
  // persist the reservation before sending: a worker restart must not reset the daily ceiling
  await chrome.storage.local.set({ [BUDGET_STORAGE_KEY]: budget })
  if (!canScan(url.hostname)) return

  const result = await fetchVerdict(url.origin).catch(() => undefined)

  if (result && result.status !== "error") failures = 0
  else if (++failures >= BREAKER_FAILURE_THRESHOLD) blockedUntil = Date.now() + BREAKER_TTL

  const now = Date.now()
  for (const [host, verdict] of verdicts) if (verdict.expiresAt <= now) verdicts.delete(host)

  const ttl = result ? Math.max(0, result.ttlSeconds) * 1_000 : MAX_VERDICT_TTL
  verdicts.set(url.hostname, {
    isMalicious: result?.isMalicious === true,
    expiresAt: now + Math.min(MAX_VERDICT_TTL, ttl),
  })
  if (isBlockaidMalicious(url.hostname)) maliciousOrigin$.next(url.origin)
}

export function requestSiteScan(rawUrl: string): void {
  if (!URL.canParse(rawUrl)) return
  const url = new URL(rawUrl)
  const host = url.hostname
  if (!isPublicWebUrl(url) || !canScan(host) || inFlight.has(host)) return

  inFlight.add(host)
  void (async () => {
    await hydrateBudget()
    if (canScan(host) && reserveBudget()) await scan(url)
  })()
    .catch(() => {})
    .finally(() => inFlight.delete(host))
}

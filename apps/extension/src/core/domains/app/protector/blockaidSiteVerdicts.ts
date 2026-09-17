import { BLOCKAID_API_URL } from "@common/constants"
import { combineLatest } from "rxjs"
import { z } from "zod"

import { gandalfFetch } from "../../gandalf/fetch"
import { remoteConfigStore } from "../store.remoteConfig"
import { settingsStore } from "../store.settings"
import { isAllowedHost, isStaticPhishingSite } from "./ParaverseProtector"

const MINUTE = 60_000
const NEGATIVE_TTL = MINUTE
const BUDGET_STORAGE_KEY = "blockaidSiteScanBudget"
const BREAKER_TTL = 10 * MINUTE
const MAX_HOSTS = 500

const budgetSchema = z.object({
  day: z.string(),
  count: z.number().int().nonnegative(),
  recent: z.array(z.number().finite()),
})
const resultSchema = z
  .object({
    status: z.enum(["hit", "miss", "error"]),
    isMalicious: z.boolean(),
    cachedAt: z.iso.datetime({ offset: true }),
    ttlSeconds: z.number().finite(),
    stale: z.boolean(),
  })
  .refine((result) => !result.isMalicious || result.status === "hit")

type Verdict = { isMalicious: boolean; expiresAt: number }
type Budget = z.infer<typeof budgetSchema>
const verdicts = new Map<string, Verdict>()
const inFlight = new Map<string, Promise<void>>()
let budget: Budget = { day: "", count: 0, recent: [] }
let enabled = false
let failures = 0
let blockedUntil = 0
let hydration: Promise<void> | undefined
let pendingWrite: Promise<void> = Promise.resolve()
let onMalicious: (origin: string) => void | Promise<void> = () => {}

combineLatest([remoteConfigStore.observable, settingsStore.observable]).subscribe({
  next: ([config, settings]) => {
    enabled = config.featureFlags.BLOCKAID_DAPP_SCAN === true && settings.autoRiskScan === true
  },
  error: () => {
    enabled = false
  },
})

function pruneVerdicts() {
  const now = Date.now()
  for (const [host, verdict] of verdicts) {
    if (verdict.expiresAt <= now) verdicts.delete(host)
  }
  if (verdicts.size <= MAX_HOSTS) return
  const byExpiry = [...verdicts].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
  for (const [host] of byExpiry.slice(0, verdicts.size - MAX_HOSTS)) verdicts.delete(host)
}

function hydrateBudget(): Promise<void> {
  hydration ??= (async () => {
    const stored = await chrome.storage.local.get(BUDGET_STORAGE_KEY)
    const parsed = budgetSchema.safeParse(stored[BUDGET_STORAGE_KEY])
    if (parsed.success) budget = parsed.data
  })()
  return hydration
}

function persistBudget(): Promise<void> {
  pendingWrite = pendingWrite
    .catch(() => {})
    .then(async () => {
      await chrome.storage.local.set({
        [BUDGET_STORAGE_KEY]: { ...budget, recent: [...budget.recent] },
      })
    })
  return pendingWrite
}

export function isBlockaidMalicious(host: string): boolean {
  if (!enabled) return false
  const verdict = verdicts.get(host)
  return verdict?.isMalicious === true && verdict.expiresAt > Date.now()
}

export function setSiteScanRedirect(callback: typeof onMalicious): void {
  onMalicious = callback
}

function reserveBudget(): boolean {
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  if (budget.day !== day) budget = { day, count: 0, recent: budget.recent }
  budget.recent = budget.recent.filter((time) => time > now - MINUTE)
  if (budget.count >= 100 || budget.recent.length >= 10) return false
  budget.count++
  budget.recent.push(now)
  return true
}

async function fetchVerdict(origin: string) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => {
        const response = await gandalfFetch(`${BLOCKAID_API_URL}/site/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: origin }),
          signal: controller.signal,
        })
        if (response.status === 429) blockedUntil = Date.now() + BREAKER_TTL
        if (response.status !== 200) throw new Error("Site scan failed")
        return resultSchema.parse(await response.json())
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error("Site scan timed out"))
        }, 8_000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function scan(url: URL): Promise<void> {
  // Reserve durably before sending: a worker restart must not reset the daily ceiling.
  await persistBudget()
  if (!enabled || blockedUntil > Date.now() || isAllowedHost(url.hostname)) return

  let verdict: Verdict = { isMalicious: false, expiresAt: Date.now() + NEGATIVE_TTL }
  let failed = true
  try {
    const result = await fetchVerdict(url.origin)
    verdict = {
      isMalicious: result.isMalicious,
      expiresAt: Date.now() + Math.min(60, Math.max(0, result.ttlSeconds)) * 1_000,
    }
    failed = result.status === "error"
  } catch {
    verdict.expiresAt = Date.now() + NEGATIVE_TTL
  }

  if (failed) {
    if (++failures >= 3) blockedUntil = Date.now() + BREAKER_TTL
  } else failures = 0

  verdicts.set(url.hostname, verdict)
  pruneVerdicts()
  if (enabled && verdict.isMalicious && !isAllowedHost(url.hostname)) await onMalicious(url.origin)
}

export function requestSiteScan(rawUrl: string): void {
  try {
    if (!enabled) return
    const url = new URL(rawUrl)
    const host = url.hostname
    const normalisedHost = host.replace(/\.$/, "")
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !normalisedHost.includes(".") ||
      normalisedHost === "localhost" ||
      normalisedHost.endsWith(".localhost") ||
      normalisedHost.endsWith(".local") ||
      normalisedHost.endsWith(".test") ||
      host.includes(":") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(normalisedHost) ||
      isAllowedHost(host) ||
      isStaticPhishingSite(rawUrl)
    )
      return
    if ((verdicts.get(host)?.expiresAt ?? 0) > Date.now() || inFlight.has(host)) return

    const pending = (async () => {
      await hydrateBudget()
      if (!enabled || (verdicts.get(host)?.expiresAt ?? 0) > Date.now()) return
      if (blockedUntil > Date.now() || !reserveBudget()) return
      await scan(url)
    })()
      .catch(() => {})
      .finally(() => {
        inFlight.delete(host)
      })
    inFlight.set(host, pending)
  } catch {}
}

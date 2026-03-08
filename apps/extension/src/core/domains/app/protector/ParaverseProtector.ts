import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { log } from "@common/log"
import { checkHost } from "@polkadot/phishing"
import { Dexie } from "dexie"
import metamaskInitialData from "eth-phishing-detect/src/config.json"
import MetamaskDetector from "eth-phishing-detect/src/detector"

import { sentry } from "../../../config/sentry"
import { getBlobStore } from "../../../db/blobs"
import { getHostName } from "../helpers"

// Fetch directly from CDN-backed raw URLs with no rate limits
// Supports ETag-based conditional requests
// return 304 when the list hasn't changed, avoiding re-downloading ~7 MB every cycle.
const METAMASK_CONFIG_URL =
  "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json"
const POLKADOT_CONFIG_URL = "https://polkadot.js.org/phishing/all.json"

const REFRESH_INTERVAL_MIN = 5

const DEFAULT_ALLOW: ReadonlyArray<string> = [
  TALISMAN_WEB_APP_DOMAIN, // app.talisman.xyz
  TALISMAN_WEB_APP_DOMAIN.split(".")
    .slice(1)
    .join("."), // talisman.xyz
]

type HostList = { allow: string[]; deny: string[] }

type MetaMaskDetectorConfig = {
  blacklist: string[]
  fuzzylist: string[]
  tolerance: number
  version: number
  whitelist: string[]
}

/** Shape stored in the blob store: data + ETag for conditional fetching. */
type PhishingBlob<T> = { etag: string; data: T }

const metamaskBlobStore = getBlobStore<PhishingBlob<MetaMaskDetectorConfig>>("phishing-metamask")
const polkadotBlobStore = getBlobStore<PhishingBlob<HostList>>("phishing-polkadot")

// ─── Validators ─────────────────────────────────────────────────────────────

function isValidMetamaskConfig(data: unknown): data is MetaMaskDetectorConfig {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return (
    Array.isArray(obj.blacklist) &&
    obj.blacklist.length > 0 &&
    Array.isArray(obj.fuzzylist) &&
    Array.isArray(obj.whitelist) &&
    typeof obj.tolerance === "number" &&
    typeof obj.version === "number"
  )
}

function isValidPolkadotList(data: unknown): data is HostList {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.deny) && obj.deny.length > 0 && Array.isArray(obj.allow)
}

// ─── Module state ───────────────────────────────────────────────────────────

let metamaskDetector = new MetamaskDetector(metamaskInitialData)
let polkadotList: HostList = { allow: [], deny: [] }
const talismanAllow = new Set<string>(DEFAULT_ALLOW)
const etags = { polkadot: "", metamask: "" }

/** Controller for in-flight fetch requests; aborted on dispose or new refresh cycle. */
let fetchController: AbortController | null = null

// ─── Data fetching ──────────────────────────────────────────────────────────

/**
 * Fetch a URL with ETag-based conditional caching.
 * Returns parsed JSON + new ETag when data changed, or null on 304 Not Modified.
 * Throws on network/HTTP errors so callers can keep existing data.
 */
async function fetchWithEtag(
  url: string,
  currentEtag: string,
  signal?: AbortSignal
): Promise<{ data: unknown; etag: string } | null> {
  const headers: HeadersInit = {}
  if (currentEtag) headers["If-None-Match"] = currentEtag

  const response = await fetch(url, { headers, signal })
  if (response.status === 304) return null
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`)

  const data: unknown = await response.json()
  const etag = response.headers.get("etag") ?? ""
  return { data, etag }
}

/** Persist a blob, swallowing DatabaseClosedError (extension shutting down). */
function persistBlob<T>(store: ReturnType<typeof getBlobStore<T>>, data: T, label: string): void {
  store.set(data).catch((cause) => {
    const isDbClosed =
      cause instanceof Dexie.DatabaseClosedError || cause.name === Dexie.errnames.DatabaseClosed
    if (!isDbClosed) {
      sentry.captureException(new Error(`Failed to persist ${label}`, { cause }))
    }
  })
}

async function refreshMetamaskList(signal?: AbortSignal) {
  try {
    const result = await fetchWithEtag(METAMASK_CONFIG_URL, etags.metamask, signal)
    if (!result) return

    if (!isValidMetamaskConfig(result.data)) {
      throw new Error("Invalid MetaMask phishing config structure")
    }

    metamaskDetector = new MetamaskDetector(result.data)
    etags.metamask = result.etag
    persistBlob(
      metamaskBlobStore,
      { etag: result.etag, data: result.data },
      "MetaMask phishing list"
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return
    log.error("Error refreshing MetaMask phishing list", { error })
  }
}

async function refreshPolkadotList(signal?: AbortSignal) {
  try {
    const result = await fetchWithEtag(POLKADOT_CONFIG_URL, etags.polkadot, signal)
    if (!result) return

    if (!isValidPolkadotList(result.data)) {
      throw new Error("Invalid Polkadot phishing list structure")
    }

    polkadotList = result.data
    etags.polkadot = result.etag
    persistBlob(
      polkadotBlobStore,
      { etag: result.etag, data: result.data },
      "Polkadot phishing list"
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return
    log.error("Error refreshing Polkadot phishing list", { error })
  }
}

// ─── Initialisation ─────────────────────────────────────────────────────────

/** Lazy-init: DB restore + periodic refresh are started on first use, not at import time. */
let initialised: Promise<void> | null = null

function ensureInitialised(): Promise<void> {
  if (!initialised) {
    initialised = restoreFromBlobStore().then(() => {
      // start periodic refresh 30 s after first use
      refreshTimer = setTimeout(scheduleRefresh, 30_000)
    })
  }
  return initialised
}

/** Restore cached phishing data from the blob store. Dexie auto-opens the DB on first query. */
async function restoreFromBlobStore() {
  try {
    const [mmBlob, pdBlob] = await Promise.all([metamaskBlobStore.get(), polkadotBlobStore.get()])

    if (mmBlob && isValidMetamaskConfig(mmBlob.data)) {
      metamaskDetector = new MetamaskDetector(mmBlob.data)
      etags.metamask = mmBlob.etag
    }
    if (pdBlob && isValidPolkadotList(pdBlob.data)) {
      polkadotList = pdBlob.data
      etags.polkadot = pdBlob.etag
    }
  } catch (err) {
    // on any error the user is only unprotected until the first refresh (30 s)
    log.error("Error restoring phishing data", { err })
  }
}

// Periodic refresh: recursive setTimeout naturally prevents overlapping fetches.
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function scheduleRefresh() {
  await refreshPhishingLists()
  refreshTimer = setTimeout(scheduleRefresh, REFRESH_INTERVAL_MIN * 60 * 1000)
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Force-refresh both phishing lists. Exposed for manual triggers and testing. */
export async function refreshPhishingLists(): Promise<void> {
  // Abort any in-flight fetches from a previous refresh cycle
  fetchController?.abort()
  const controller = new AbortController()
  fetchController = controller

  await Promise.all([
    refreshMetamaskList(controller.signal),
    refreshPolkadotList(controller.signal),
  ])
}

/** Check whether a URL is on a known phishing list. Lazily initialises on first call. */
export async function isPhishingSite(url: string): Promise<boolean> {
  await ensureInitialised()

  const { val: host, ok } = getHostName(url)
  if (!ok) return false

  // talisman allow list (includes user exceptions)
  if (talismanAllow.has(host)) return false

  // polkadot deny list
  if (checkHost(polkadotList.deny, host)) {
    log.warn(`Phishing site listed on Polkadot list: ${host}`)
    return true
  }

  // metamask deny / fuzzy list
  const { result: mmResult } = metamaskDetector.check(host)
  if (mmResult) {
    log.warn(`Phishing site listed on MetaMask list: ${host}`)
    return true
  }

  return false
}

/** Whitelist a URL so it is no longer flagged as phishing for this session. */
export function addException(url: string): boolean {
  const { val: host, ok } = getHostName(url)
  if (!ok) return false

  talismanAllow.add(host)
  return true
}

/** Tear down timers and abort in-flight fetches. Useful for clean shutdown and testing. */
export function dispose(): void {
  fetchController?.abort()
  fetchController = null
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  initialised = null
}

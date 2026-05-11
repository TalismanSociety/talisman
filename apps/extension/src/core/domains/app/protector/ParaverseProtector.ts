import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { log } from "@common/log"
import { PhishingDetector } from "@metamask/phishing-controller"
import { checkHost } from "@polkadot/phishing"
import { Dexie } from "dexie"

import { sentry } from "../../../config/sentry"
import { getBlobStore } from "../../../db/blobs"
import { getHostName } from "../helpers"
import { initialPhishingList } from "./initial-phishing-list"

// Supports ETag-based conditional requests (304 = no re-download).
const METAMASK_CONFIG_URL = "https://phishing-detection.api.cx.metamask.io/v1/stalelist"
const POLKADOT_CONFIG_URL = "https://polkadot.js.org/phishing/all.json"

const REFRESH_INTERVAL_MIN = 5
const REFRESH_TIMEOUT_MS = 15_000
const INITIAL_REFRESH_DELAY_MS = 30_000

const DEFAULT_ALLOW: ReadonlyArray<string> = [
  TALISMAN_WEB_APP_DOMAIN, // app.talisman.xyz
  TALISMAN_WEB_APP_DOMAIN.split(".")
    .slice(1)
    .join("."), // talisman.xyz
]

type HostList = { allow: string[]; deny: string[] }

/** Shape returned by phishing-detection.api.cx.metamask.io/v1/stalelist */
export type MetaMaskPhishingList = {
  allowlist: string[]
  blocklist: string[]
  blocklistPaths: string[]
  fuzzylist: string[]
  tolerance: number
  version: number
}

/** API envelope: the actual list is nested under `data`. */
type MetaMaskApiResponse = { data: MetaMaskPhishingList }

/** Shape stored in the blob store: data + ETag for conditional fetching. */
type PhishingBlob<T> = { etag: string; data: T }

const metamaskBlobStore = getBlobStore<PhishingBlob<MetaMaskPhishingList>>("phishing-metamask")
const polkadotBlobStore = getBlobStore<PhishingBlob<HostList>>("phishing-polkadot")

// ─── Validators ─────────────────────────────────────────────────────────────

function isValidMetamaskList(data: unknown): data is MetaMaskPhishingList {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return (
    Array.isArray(obj.blocklist) &&
    obj.blocklist.length > 0 &&
    Array.isArray(obj.blocklistPaths) &&
    Array.isArray(obj.fuzzylist) &&
    Array.isArray(obj.allowlist) &&
    typeof obj.tolerance === "number" &&
    typeof obj.version === "number"
  )
}

/** Unwrap the API envelope, returning the inner list or null. */
function extractMetamaskList(raw: unknown): MetaMaskPhishingList | null {
  const envelope = raw as MetaMaskApiResponse
  return isValidMetamaskList(envelope?.data) ? envelope.data : null
}

type PathNode = { [key: string]: PathNode }
type PathTrie = Record<string, PathNode>

const isTerminalPathNode = (node: PathNode | undefined): boolean =>
  !!node && Object.keys(node).length === 0

function parseBlocklistPath(path: string): { hostname: string; pathComponents: string[] } | null {
  const url = path.startsWith("http") ? path : `https://${path}`

  try {
    const { hostname, pathname } = new URL(url)
    const pathComponents = pathname
      .split("/")
      .filter(Boolean)
      .map((component) => decodeURIComponent(component))

    return hostname && pathComponents.length
      ? { hostname: hostname.toLowerCase(), pathComponents }
      : null
  } catch {
    return null
  }
}

function getOrCreateChild(node: PathNode, key: string): PathNode {
  const child = node[key]
  if (child) return child

  const next: PathNode = {}
  node[key] = next
  return next
}

function buildPathTrie(paths: string[]): PathTrie {
  const trie: PathTrie = {}
  for (const path of paths) {
    const parsed = parseBlocklistPath(path)
    if (!parsed) continue

    let current = getOrCreateChild(trie, parsed.hostname)
    for (let index = 0; index < parsed.pathComponents.length; index++) {
      const pathComponent = parsed.pathComponents[index]
      const child = current[pathComponent]
      const isLast = index === parsed.pathComponents.length - 1

      if (child && !isLast && isTerminalPathNode(child)) break

      if (isLast) {
        current[pathComponent] = {}
        break
      }

      current = child ?? getOrCreateChild(current, pathComponent)
    }
  }
  return trie
}

function normaliseUrlException(url: string): string | null {
  try {
    const parsed = new URL(url)
    parsed.hash = ""
    parsed.search = ""
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.toString()
  } catch {
    return null
  }
}

function isPathMatch(match: unknown): match is string {
  return typeof match === "string" && match.includes("/")
}

/** Build a PhishingDetector from the modern allowlist/blocklist shape. */
function buildMetamaskDetector(list: MetaMaskPhishingList): PhishingDetector {
  return new PhishingDetector([
    {
      name: "MetaMask",
      version: list.version,
      allowlist: list.allowlist,
      blocklist: list.blocklist,
      blocklistPaths: buildPathTrie(list.blocklistPaths),
      fuzzylist: list.fuzzylist,
      tolerance: list.tolerance,
    },
  ])
}

function isValidPolkadotList(data: unknown): data is HostList {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.deny) && obj.deny.length > 0 && Array.isArray(obj.allow)
}

// ─── Module state ───────────────────────────────────────────────────────────

let metamaskDetector = buildMetamaskDetector(initialPhishingList)
let polkadotList: HostList = { allow: [], deny: [] }
const talismanAllowHosts = new Set<string>(DEFAULT_ALLOW)
const talismanAllowUrls = new Set<string>()
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
    if (signal?.aborted || !result) return

    const list = extractMetamaskList(result.data)
    if (!list) {
      throw new Error("Invalid MetaMask phishing list structure")
    }

    metamaskDetector = buildMetamaskDetector(list)
    etags.metamask = result.etag
    persistBlob(metamaskBlobStore, { etag: result.etag, data: list }, "MetaMask phishing list")
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return
    log.error("Error refreshing MetaMask phishing list", { error })
  }
}

async function refreshPolkadotList(signal?: AbortSignal) {
  try {
    const result = await fetchWithEtag(POLKADOT_CONFIG_URL, etags.polkadot, signal)
    if (signal?.aborted || !result) return

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
let lifecycleGeneration = 0

function ensureInitialised(): Promise<void> {
  if (!initialised) {
    const generation = lifecycleGeneration
    const promise = restoreFromBlobStore().then(async ({ hasMetamaskCache }) => {
      if (generation !== lifecycleGeneration || initialised !== promise) return
      if (!hasMetamaskCache) await refreshPhishingLists()
      if (generation !== lifecycleGeneration || initialised !== promise) return
      // start periodic refresh 30 s after first use
      refreshTimer = setTimeout(() => scheduleRefresh(generation), INITIAL_REFRESH_DELAY_MS)
    })
    initialised = promise
  }
  return initialised
}

/** Restore cached phishing data from the blob store. Dexie auto-opens the DB on first query. */
async function restoreFromBlobStore(): Promise<{ hasMetamaskCache: boolean }> {
  let hasMetamaskCache = false

  try {
    const [mmBlob, pdBlob] = await Promise.all([metamaskBlobStore.get(), polkadotBlobStore.get()])

    if (mmBlob && isValidMetamaskList(mmBlob.data)) {
      metamaskDetector = buildMetamaskDetector(mmBlob.data)
      etags.metamask = mmBlob.etag
      hasMetamaskCache = true
    }
    if (pdBlob && isValidPolkadotList(pdBlob.data)) {
      polkadotList = pdBlob.data
      etags.polkadot = pdBlob.etag
    }
  } catch (err) {
    log.error("Error restoring phishing data", { err })
  }

  return { hasMetamaskCache }
}

// Periodic refresh: recursive setTimeout naturally prevents overlapping fetches.
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function scheduleRefresh(generation = lifecycleGeneration) {
  await refreshPhishingLists()
  if (generation !== lifecycleGeneration || !initialised) return
  refreshTimer = setTimeout(() => scheduleRefresh(generation), REFRESH_INTERVAL_MIN * 60 * 1000)
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Force-refresh both phishing lists. Exposed for manual triggers and testing. */
export async function refreshPhishingLists(): Promise<void> {
  // Abort any in-flight fetches from a previous refresh cycle
  fetchController?.abort()
  const controller = new AbortController()
  fetchController = controller
  let didTimeout = false
  const timeout = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, REFRESH_TIMEOUT_MS)

  try {
    await Promise.all([
      refreshMetamaskList(controller.signal),
      refreshPolkadotList(controller.signal),
    ])
    if (didTimeout) log.warn("Timed out refreshing phishing lists")
  } finally {
    clearTimeout(timeout)
    if (fetchController === controller) fetchController = null
  }
}

/** Check whether a URL is on a known phishing list. Lazily initialises on first call. */
export async function isPhishingSite(url: string): Promise<boolean> {
  await ensureInitialised()

  const { val: host, ok } = getHostName(url)
  if (!ok) return false

  // talisman host allow list (includes host-scoped user exceptions)
  if (talismanAllowHosts.has(host)) return false

  // polkadot deny list
  if (checkHost(polkadotList.deny, host)) {
    log.warn(`Phishing site listed on Polkadot list: ${host}`)
    return true
  }

  // metamask deny / fuzzy list
  const { match, result: mmResult } = metamaskDetector.check(url)
  if (mmResult) {
    const urlException = normaliseUrlException(url)
    if (urlException && isPathMatch(match) && talismanAllowUrls.has(urlException)) return false

    log.warn(`Phishing site listed on MetaMask list: ${host}`)
    return true
  }

  return false
}

/** Whitelist a URL so it is no longer flagged as phishing for this session. */
export function addException(url: string): boolean {
  const { val: host, ok } = getHostName(url)
  if (!ok) return false

  const polkadotHostHit = checkHost(polkadotList.deny, host)
  const { match, result: mmResult } = metamaskDetector.check(url)

  if (!polkadotHostHit && mmResult && isPathMatch(match)) {
    const urlException = normaliseUrlException(url)
    if (!urlException) return false

    talismanAllowUrls.add(urlException)
    return true
  }

  talismanAllowHosts.add(host)
  return true
}

/** Tear down timers and abort in-flight fetches. Useful for clean shutdown and testing. */
export function dispose(): void {
  lifecycleGeneration++
  fetchController?.abort()
  fetchController = null
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  metamaskDetector = buildMetamaskDetector(initialPhishingList)
  polkadotList = { allow: [], deny: [] }
  etags.metamask = ""
  etags.polkadot = ""
  talismanAllowHosts.clear()
  for (const host of DEFAULT_ALLOW) talismanAllowHosts.add(host)
  talismanAllowUrls.clear()
  initialised = null
}

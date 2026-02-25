import { checkHost } from "@polkadot/phishing"
import { Dexie } from "dexie"
import metamaskInitialData from "eth-phishing-detect/src/config.json"
import MetamaskDetector from "eth-phishing-detect/src/detector"
import { log, TALISMAN_WEB_APP_DOMAIN } from "extension-shared"

import { sentry } from "../../../config/sentry"
import { db } from "../../../db"
import { getBlobStore } from "../../../db/blobs"
import { getHostName } from "../helpers"

// Fetch directly from CDN-backed raw URLs — no GitHub API rate limits (60 req/hr),
// no base64 decoding, no branch-name fragility. ETag-based conditional requests
// return 304 when the list hasn't changed, avoiding re-downloading ~7 MB every cycle.
const METAMASK_CONFIG_URL =
  "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json"
const POLKADOT_CONFIG_URL = "https://polkadot.js.org/phishing/all.json"

const REFRESH_INTERVAL_MIN = 5

const DEFAULT_ALLOW = [
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

type ProtectorData = Record<"talisman" | "polkadot", HostList>

/** Shape stored in the blob store: data + ETag for conditional fetching. */
type PhishingBlob<T> = { etag: string; data: T }

const metamaskBlobStore = getBlobStore<PhishingBlob<MetaMaskDetectorConfig>>("phishing-metamask")
const polkadotBlobStore = getBlobStore<PhishingBlob<HostList>>("phishing-polkadot")

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
  return Array.isArray(obj.deny) && Array.isArray(obj.allow)
}

export default class ParaverseProtector {
  #initialised: Promise<boolean>
  #etags = {
    polkadot: "",
    metamask: "",
  }
  lists: ProtectorData = {
    talisman: { allow: DEFAULT_ALLOW, deny: [] },
    polkadot: { allow: [], deny: [] },
  }
  #refreshTimer?: ReturnType<typeof setInterval>
  #metamaskDetector = new MetamaskDetector(metamaskInitialData)

  constructor() {
    this.setRefreshTimer = this.setRefreshTimer.bind(this)
    this.#refreshTimer = setInterval(this.setRefreshTimer, REFRESH_INTERVAL_MIN * 60 * 1000)
    // do the first check once after 30 seconds
    setTimeout(this.setRefreshTimer, 30_000)
    this.#initialised = this.initialise()
  }

  async initialise() {
    // restore persisted data from blob store
    return new Promise<boolean>((resolve) => {
      db.on(
        "ready",
        async () => {
          try {
            await this.restoreFromBlobStore()
          } catch (err) {
            log.error("Error restoring phishing data", { err })
          }
          resolve(true)
        },
        false
      )
    }).catch((err) => {
      // in the case of any error, the user should only be unprotected until the first update runs (30 seconds)
      log.error(err)
      return true
    })
  }

  /** Restore cached phishing data from the compressed blob store. */
  private async restoreFromBlobStore() {
    const [mmBlob, pdBlob] = await Promise.all([metamaskBlobStore.get(), polkadotBlobStore.get()])

    if (mmBlob && isValidMetamaskConfig(mmBlob.data)) {
      this.#metamaskDetector = new MetamaskDetector(mmBlob.data)
      this.#etags.metamask = mmBlob.etag
    }

    if (pdBlob && isValidPolkadotList(pdBlob.data)) {
      this.lists.polkadot = pdBlob.data
      this.#etags.polkadot = pdBlob.etag
    }
  }

  isInitialised() {
    return this.#initialised
  }

  async setRefreshTimer() {
    await Promise.all([this.refreshMetamaskList(), this.refreshPolkadotList()])
  }

  /**
   * Fetch a URL with ETag-based conditional caching.
   * Returns parsed JSON + new ETag when data changed, or null on 304 Not Modified.
   * Throws on network/HTTP errors so callers can keep existing data.
   */
  async fetchWithEtag(
    url: string,
    currentEtag: string
  ): Promise<{ data: unknown; etag: string } | null> {
    const headers: HeadersInit = {}
    if (currentEtag) {
      headers["If-None-Match"] = currentEtag
    }

    const response = await fetch(url, { headers })

    // 304: content unchanged since last fetch — keep current data
    if (response.status === 304) return null

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`)
    }

    const data: unknown = await response.json()
    const etag = response.headers.get("etag") ?? ""

    return { data, etag }
  }

  async refreshMetamaskList() {
    try {
      const result = await this.fetchWithEtag(METAMASK_CONFIG_URL, this.#etags.metamask)
      if (!result) return // 304 — no changes

      if (!isValidMetamaskConfig(result.data)) {
        throw new Error("Invalid MetaMask phishing config structure")
      }

      this.#metamaskDetector = new MetamaskDetector(result.data)
      this.#etags.metamask = result.etag
      await metamaskBlobStore.set({ etag: result.etag, data: result.data }).catch((cause) => {
        const isDbClosed =
          cause instanceof Dexie.DatabaseClosedError || cause.name === Dexie.errnames.DatabaseClosed
        if (!isDbClosed) {
          sentry.captureException(new Error("Failed to persist MetaMask phishing list", { cause }))
        }
      })
    } catch (error) {
      log.error("Error refreshing MetaMask phishing list", { error })
    }
  }

  async refreshPolkadotList() {
    try {
      const result = await this.fetchWithEtag(POLKADOT_CONFIG_URL, this.#etags.polkadot)
      if (!result) return // 304 — no changes

      if (!isValidPolkadotList(result.data)) {
        throw new Error("Invalid Polkadot phishing list structure")
      }

      this.lists.polkadot = result.data
      this.#etags.polkadot = result.etag
      await polkadotBlobStore.set({ etag: result.etag, data: result.data }).catch((cause) => {
        const isDbClosed =
          cause instanceof Dexie.DatabaseClosedError || cause.name === Dexie.errnames.DatabaseClosed
        if (!isDbClosed) {
          sentry.captureException(new Error("Failed to persist Polkadot phishing list", { cause }))
        }
      })
    } catch (error) {
      log.error("Error refreshing Polkadot phishing list", { error })
    }
  }

  async isPhishingSite(url: string) {
    await this.isInitialised()
    const { val: host, ok } = getHostName(url)
    if (!ok) return false

    // first check our lists
    if (this.lists.talisman.allow.includes(host)) return false
    if (this.lists.talisman.deny.includes(host)) return true

    // then check polkadot and metamask lists
    const pdResult = checkHost(this.lists.polkadot.deny, host)
    if (pdResult) {
      log.warn(`Phishing site listed on Polkadot list: ${host}`)
      return true
    }
    const { result: mmResult } = this.#metamaskDetector.check(host)
    if (mmResult) {
      log.warn(`Phishing site listed on MetaMask list: ${host}`)
      return true
    }

    return false
  }

  addException(url: string) {
    const { val: host, ok } = getHostName(url)
    if (!ok) return false

    this.lists.talisman.allow.push(host)
    return true
  }
}

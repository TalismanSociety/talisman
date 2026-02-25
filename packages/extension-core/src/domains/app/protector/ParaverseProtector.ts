import { checkHost } from "@polkadot/phishing"
import { isNotNil } from "@talismn/util"
import { Dexie } from "dexie"
import metamaskInitialData from "eth-phishing-detect/src/config.json"
import MetamaskDetector from "eth-phishing-detect/src/detector"
import { log, TALISMAN_WEB_APP_DOMAIN } from "extension-shared"
import { decompressFromUTF16 } from "lz-string"

import { sentry } from "../../../config/sentry"
import { db } from "../../../db"
import { getHostName } from "../helpers"

// Fetch directly from CDN-backed raw URLs — no GitHub API rate limits (60 req/hr),
// no base64 decoding, no branch-name fragility. ETag-based conditional requests
// return 304 when the list hasn't changed, avoiding re-downloading ~7 MB every cycle.
const METAMASK_CONFIG_URL =
  "https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/main/src/config.json"
const POLKADOT_CONFIG_URL = "https://polkadot.js.org/phishing/all.json"

const REFRESH_INTERVAL_MIN = 20

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

export type ProtectorData = Record<"talisman" | "polkadot", HostList>

export type ProtectorSources = "polkadot" | "metamask" // don't persist Talisman

// Note: the `commitSha` field is reused to store HTTP ETags for cache validation.
// Keeping the field name avoids a Dexie schema migration for what is just a transient cache.
export type ProtectorStorage = {
  source: ProtectorSources
  commitSha: string // stores ETag (or legacy commit SHA — both are opaque cache keys)
  compressedHostList?: string // legacy compressed format, kept for migration
  hostList?: HostList | MetaMaskDetectorConfig
}

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
  #persistQueue?: Record<ProtectorSources, ProtectorStorage>

  constructor() {
    this.setRefreshTimer = this.setRefreshTimer.bind(this)
    this.#refreshTimer = setInterval(this.setRefreshTimer, REFRESH_INTERVAL_MIN * 60 * 1000)
    // do the first check once after 30 seconds
    setTimeout(this.setRefreshTimer, 30_000)
    this.#initialised = this.initialise()
  }

  async initialise() {
    // restore persisted data
    return new Promise<boolean>((resolve) => {
      db.on(
        "ready",
        () => {
          db.phishing.bulkGet(["polkadot", "metamask"]).then((persisted) => {
            ;(persisted.filter(isNotNil) as ProtectorStorage[]).forEach(
              ({ source, compressedHostList, hostList, commitSha }) => {
                const fullData = hostList
                  ? hostList
                  : JSON.parse(
                      // Legacy: decompress old format (safe to remove in a future release)
                      (compressedHostList && decompressFromUTF16(compressedHostList)) || "{}"
                    )

                if (!fullData) return

                // Restore cached ETag (or legacy commit SHA — either works as a cache key,
                // a mismatch just causes one extra full fetch which is harmless)
                this.#etags[source] = commitSha

                if (source === "metamask") {
                  if (isValidMetamaskConfig(fullData)) {
                    this.#metamaskDetector = new MetamaskDetector(fullData)
                  }
                } else if (isValidPolkadotList(fullData)) {
                  this.lists[source] = fullData
                }
              }
            )
            resolve(true)
          })
        },
        false
      )
    }).catch((err) => {
      // in the case of any error, the user should only be unprotected until the first update runs (30 seconds)
      log.error(err)
      return true
    })
  }

  isInitialised() {
    return this.#initialised
  }

  async setRefreshTimer() {
    await Promise.all([this.refreshMetamaskList(), this.refreshPolkadotList()])
    await this.persistAllData()
  }

  async persistAllData() {
    if (this.#persistQueue && Object.values(this.#persistQueue).length > 0) {
      const data = this.#persistQueue
      this.#persistQueue = {} as Record<ProtectorSources, ProtectorStorage>

      await db.phishing.bulkPut(Object.values(data)).catch((cause) => {
        // put it back
        this.#persistQueue = data
        // we can't do much about DatabaseClosedError errors
        if (
          !(cause instanceof Dexie.DatabaseClosedError) &&
          !(cause.name !== Dexie.errnames.DatabaseClosed)
        ) {
          const error = new Error("Failed to persist phishing list", { cause })
          sentry.captureException(error)
        }
      })
    }
  }

  private persistData(source: "metamask", etag: string, data: MetaMaskDetectorConfig): void
  private persistData(source: "polkadot", etag: string, data: HostList): void
  private persistData(
    source: "polkadot" | "metamask",
    etag: string,
    data: HostList | MetaMaskDetectorConfig
  ): void {
    if (!this.#persistQueue) this.#persistQueue = {} as Record<ProtectorSources, ProtectorStorage>
    // Store ETag in the commitSha field to avoid a Dexie schema migration
    this.#persistQueue[source] = { source, commitSha: etag, hostList: data }
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
      this.persistData("metamask", result.etag, result.data)
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
      this.persistData("polkadot", result.etag, result.data)
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

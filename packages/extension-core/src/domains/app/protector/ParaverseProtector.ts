import { checkHost } from "@polkadot/phishing"
import { Dexie } from "dexie"
import metamaskInitialData from "eth-phishing-detect/src/config.json"
import MetamaskDetector from "eth-phishing-detect/src/detector"
import { log } from "extension-shared"
import { decompressFromUTF16 } from "lz-string"

import { sentry } from "../../../config/sentry"
import { db } from "../../../db"
import { getHostName } from "../helpers"

const METAMASK_REPO = "https://api.github.com/repos/MetaMask/eth-phishing-detect"
const METAMASK_CONTENT_URL = `${METAMASK_REPO}/contents/src/config.json`
const POLKADOT_REPO = "https://api.github.com/repos/polkadot-js/phishing"
const POLKADOT_CONTENT_URL = "https://polkadot.js.org/phishing/all.json"
const PHISHFORT_REPO = "https://api.github.com/repos/phishfort/phishfort-lists"
const PHISHFORT_CONTENT_URL =
  "https://raw.githubusercontent.com/phishfort/phishfort-lists/master/blacklists/hotlist.json"
const COMMIT_PATH = "/commits/master"

const REFRESH_INTERVAL_MIN = 20

const DEFAULT_ALLOW = ["talisman.xyz", "app.talisman.xyz"]

type HostList = { allow: string[]; deny: string[] }

type MetaMaskDetectorConfig = {
  blacklist: string[]
  fuzzylist: string[]
  tolerance: number
  version: number
  whitelist: string[]
}

export type ProtectorData = Record<"talisman" | "polkadot" | "phishfort", HostList>

export type ProtectorSources = "polkadot" | "phishfort" | "metamask" // don't persist Talisman

export type ProtectorStorage = {
  source: ProtectorSources
  commitSha: string
  compressedHostList?: string
  hostList?: HostList | MetaMaskDetectorConfig
}

export default class ParaverseProtector {
  #initialised: Promise<boolean>
  #commits = {
    polkadot: "",
    metamask: "",
    phishfort: "",
  }
  lists: ProtectorData = {
    talisman: { allow: DEFAULT_ALLOW, deny: [] },
    polkadot: { allow: [], deny: [] },
    phishfort: { allow: [], deny: [] },
  }
  #refreshTimer?: NodeJS.Timer
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
          db.phishing.bulkGet(["polkadot", "phishfort", "metamask"]).then((persisted) => {
            ;(persisted.filter(Boolean) as ProtectorStorage[]).forEach(
              ({ source, compressedHostList, hostList, commitSha }) => {
                const fullData = hostList
                  ? hostList
                  : JSON.parse(
                      // todo remove decompressFromUTF16 in next release
                      (compressedHostList && decompressFromUTF16(compressedHostList)) || "{}"
                    )

                if (!fullData) return

                this.#commits[source] = commitSha

                if (source === "metamask") {
                  this.#metamaskDetector = new MetamaskDetector(fullData as MetaMaskDetectorConfig)
                } else this.lists[source] = fullData
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
    await this.getMetamaskCommit()
    await this.getPolkadotCommit()
    await this.getPhishFortCommit()
    await this.persistAllData()
  }

  async persistAllData() {
    if (this.#persistQueue && Object.values(this.#persistQueue).length > 0) {
      const data = this.#persistQueue
      this.#persistQueue = {} as Record<ProtectorSources, ProtectorStorage>

      db.phishing.bulkPut(Object.values(data)).catch((cause) => {
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

  private persistData(source: "metamask", commitSha: string, data: MetaMaskDetectorConfig): void
  private persistData(source: "polkadot" | "phishfort", commitSha: string, data: HostList): void
  private persistData(
    source: "polkadot" | "phishfort" | "metamask",
    commitSha: string,
    data: HostList | MetaMaskDetectorConfig
  ): void {
    if (!this.#persistQueue) this.#persistQueue = {} as Record<ProtectorSources, ProtectorStorage>
    this.#persistQueue[source] = { source, commitSha, hostList: data }
  }

  async getCommitSha(url: string) {
    const sha = await fetch(url, {
      headers: [["Accept", "application/vnd.github.VERSION.sha"]],
    })
    return await sha.text()
  }

  async getMetamaskCommit() {
    try {
      const sha = await this.getCommitSha(`${METAMASK_REPO}${COMMIT_PATH}`)
      if (sha !== this.#commits.metamask) {
        const mmConfig = await this.getMetamaskData()
        this.#metamaskDetector = new MetamaskDetector(mmConfig)
        this.#commits.metamask = sha
        this.persistData("metamask", sha, mmConfig)
      }
    } catch (error) {
      log.error("Error getting metamask phishing commit and data", { error })
    }
  }

  async getPolkadotCommit() {
    try {
      const sha = await this.getCommitSha(`${POLKADOT_REPO}${COMMIT_PATH}`)
      if (sha !== this.#commits.polkadot) {
        this.lists.polkadot = await this.getPolkadotData()
        this.#commits.polkadot = sha
        this.persistData("polkadot", sha, this.lists.polkadot)
      }
    } catch (error) {
      log.error("Error getting polkadot phishing commit and data", { error })
    }
  }

  async getPolkadotData() {
    return await this.getData(POLKADOT_CONTENT_URL)
  }

  async getPhishFortCommit() {
    try {
      const sha = await this.getCommitSha(`${PHISHFORT_REPO}${COMMIT_PATH}`)
      if (sha !== this.#commits.phishfort) {
        this.lists.phishfort.deny = await this.getPhishFortData()
        this.#commits.phishfort = sha
        this.persistData("phishfort", sha, this.lists.phishfort)
      }
    } catch (error) {
      log.error("Error getting phishfort phishing commit and data", { error })
    }
  }

  async getPhishFortData() {
    return await this.getData(PHISHFORT_CONTENT_URL)
  }

  private async getData(url: string) {
    const response = await fetch(url)
    if (response.status === 200) {
      return await response.json()
    }
    throw new Error(`Error fetching data from ${url}`)
  }

  async getMetamaskData(): Promise<MetaMaskDetectorConfig> {
    const json = await this.getData(METAMASK_CONTENT_URL)
    if (json.content === "" && json.download_url) return await this.getData(json.download_url)
    if (!json.content) throw new Error("Unable to get content for Metamask phishing list")
    return JSON.parse(Buffer.from(json.content, "base64").toString())
  }

  async isPhishingSite(url: string) {
    await this.isInitialised()
    const { val: host, ok } = getHostName(url)
    if (!ok) return false

    // first check our lists
    if (this.lists.talisman.allow.includes(host)) return false
    if (this.lists.talisman.deny.includes(host)) return true

    // then check polkadot, phishFort, and metamask lists
    const pdResult = checkHost(this.lists.polkadot.deny, host)
    if (pdResult) return true
    const phishFortResult = this.lists.phishfort.deny.includes(host)
    if (phishFortResult) return true
    const { result: mmResult } = this.#metamaskDetector.check(host)
    if (mmResult) return true
    return false
  }

  addException(url: string) {
    const { val: host, ok } = getHostName(url)
    if (!ok) return false

    this.lists.talisman.allow.push(host)
    return true
  }
}

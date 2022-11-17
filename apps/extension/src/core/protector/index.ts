import { checkHost } from "@polkadot/phishing"
import MetamaskDetector from "eth-phishing-detect/src/detector"
import metamaskInitialData from "eth-phishing-detect/src/config.json"

const METAMASK_REPO = "https://api.github.com/repos/MetaMask/eth-phishing-detect"
const METAMASK_CONTENT_URL = `${METAMASK_REPO}/contents/src/config.json`
const POLKADOT_REPO = "https://api.github.com/repos/polkadot-js/phishing"
const POLKADOT_CONTENT_URL = "https://polkadot.js.org/phishing/all.json"

const COMMIT_PATH = "/commits/master"

const DEFAULT_ALLOW = ["talisman.xyz", "app.talisman.xyz"]

type HostList = { allow: string[]; deny: string[] }

type MetaMaskDetectorConfig = {
  blacklist: string[]
  fuzzylist: string[]
  tolerance: number
  version: number
  whitelist: string[]
}

type PolkadotConfig = HostList

class ParaverseProtector {
  #polkadotCommit = ""
  #metamaskCommit = ""
  #refreshTimer?: NodeJS.Timer
  #metamaskDetector = new MetamaskDetector(metamaskInitialData)
  lists: Record<"talisman" | "polkadot", HostList> = {
    talisman: { allow: DEFAULT_ALLOW, deny: [] },
    polkadot: { allow: [], deny: [] },
  }

  constructor() {
    // polkadot data must be fetched on init, metamask is bundled with package
    this.getPolkadotCommit()
    this.setRefreshTimer = this.setRefreshTimer.bind(this)
    this.#refreshTimer = setInterval(this.setRefreshTimer, 20 * 60 * 1000) // 20 minutes
  }

  async setRefreshTimer() {
    await this.getMetamaskCommit()
    await this.getPolkadotCommit()
  }

  private async getCommitSha(url: string) {
    const sha = await fetch(url, {
      headers: [["Accept", "application/vnd.github.VERSION.sha"]],
    })
    return await sha.text()
  }

  async getMetamaskCommit() {
    const sha = await this.getCommitSha(`${METAMASK_REPO}${COMMIT_PATH}`)
    if (sha !== this.#metamaskCommit) {
      this.#metamaskCommit = sha
      this.#metamaskDetector = new MetamaskDetector(await this.getMetamaskData())
    }
  }

  async getPolkadotCommit() {
    const sha = await this.getCommitSha(`${POLKADOT_REPO}${COMMIT_PATH}`)

    if (sha !== this.#polkadotCommit) {
      this.#polkadotCommit = sha
      this.lists.polkadot = await this.getPolkadotData()
    }
  }

  private async getData(url: string) {
    return await (await fetch(url)).json()
  }

  private async getMetamaskData(): Promise<MetaMaskDetectorConfig> {
    const json = await this.getData(METAMASK_CONTENT_URL)
    return JSON.parse(Buffer.from(json.content, "base64").toString())
  }

  private async getPolkadotData(): Promise<PolkadotConfig> {
    return await this.getData(POLKADOT_CONTENT_URL)
  }

  isPhishingSite(url: string) {
    const host = new URL(url).hostname

    // first check our lists
    if (this.lists.talisman.allow.includes(host)) return false
    if (this.lists.talisman.deny.includes(host)) return true

    // then check polkadot and metamask lists
    const pdResult = checkHost(this.lists.polkadot.deny, host)
    const { result: mmResult } = this.#metamaskDetector.check(host)
    return pdResult || mmResult
  }
}

export { ParaverseProtector }

import TtlCache from "@isaacs/ttlcache"
import { BLOCKAID_API_URL, log } from "extension-shared"
import PQueue from "p-queue"

import { isFeatureFlagEnabled } from "../store.remoteConfig"

const CACHE = new TtlCache<string, boolean>({ max: 100, ttl: 1000 * 60 * 5 }) // 5 minutes

// front end may be spamming requests for same url, queue them to avoid duplicate queries
const POOL = new PQueue({ concurrency: 1 })

export const fetchBlockaidIsMalicious = async (url: string): Promise<boolean> => {
  const isEnabled = await isFeatureFlagEnabled("BLOCKAID_DAPP_SCAN")
  if (!isEnabled) return false

  const res = await POOL.add(() => fetchBlockaidIsMaliciousInner(url))
  return res ?? false
}

const fetchBlockaidIsMaliciousInner = async (url: string): Promise<boolean> => {
  try {
    const origin = new URL(url).origin
    if (CACHE.has(origin)) {
      return CACHE.get(origin) as boolean
    }

    const apiUrl = new URL(`${BLOCKAID_API_URL}/checkurl`)
    apiUrl.searchParams.append("url", origin)

    const res = await fetch(apiUrl)
    if (res.ok) {
      const { isMalicious } = (await res.json()) as { isMalicious: boolean }
      if (typeof isMalicious !== "boolean") throw new Error("Unexpected response")
      if (isMalicious) log.warn(`Phishing site listed on Blockaid: ${origin}`)

      CACHE.set(origin, isMalicious)
      return isMalicious
    } else {
      log.error("Error fetching malicious status:", {
        url,
        status: res.status,
        statusText: res.statusText,
      })
      return false
    }
  } catch (err) {
    log.error("Error fetching malicious status:", { url, err })
    return true
  }
}

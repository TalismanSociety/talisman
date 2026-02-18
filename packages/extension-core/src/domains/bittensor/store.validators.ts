import { keepAlive, type Loadable } from "@talismn/util"
import { log } from "extension-shared"
import { Observable, shareReplay, startWith } from "rxjs"

import { getBlobStore } from "../../db"
import { getTaoDataApi } from "./tao-data/exports"
import type { BittensorValidator } from "./types"

const blobStore = getBlobStore<BittensorValidator[]>("bittensor-validators")

const REFRESH_INTERVAL = 600_000 // 10 mins
const taoDataApi = getTaoDataApi()

let lastUpdatedAt = 0

const fetchAllBittensorValidators = async (signal?: AbortSignal): Promise<BittensorValidator[]> => {
  const response = await taoDataApi.validators.listValidators({ signal })

  return response.data.map((validator) => ({
    hotkey: {
      ss58: validator.hotkey,
      hex: "",
    },
    coldkey: {
      ss58: validator.coldkey,
      hex: "",
    },
    name: validator.name ?? "",
    block_number: 0,
    timestamp: "",
    created_on_date: "",
    rank: validator.rank,
    root_rank: 0,
    alpha_rank: 0,
    active_subnets: validator.active_subnets,
    global_nominators: validator.global_nominators,
    global_nominators_24_hr_change: 0,
    take: "0",
    global_weighted_stake: validator.global_weighted_stake,
    global_weighted_stake_24_hr_change: "0",
    global_alpha_stake_as_tao: "0",
    root_stake: "0",
    weighted_root_stake: "0",
    dominance: "0",
    dominance_24_hr_change: "0",
    nominator_return_per_day: "0",
    validator_return_per_day: "0",
  }))
}

export const bittensorValidators$ = new Observable<Loadable<BittensorValidator[]>>((subscriber) => {
  const controller = new AbortController()
  subscriber.add(() => controller.abort())

  let timeout: ReturnType<typeof setTimeout> | null = null
  subscriber.add(() => timeout && clearTimeout(timeout))

  // Track the latest data we've emitted - don't emit loading states that would cause flicker
  let latestData: BittensorValidator[] = []
  let hasEmittedData = false

  const refresh = async () => {
    try {
      const delay = Math.max(0, lastUpdatedAt + REFRESH_INTERVAL - Date.now())
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (controller.signal.aborted) return

      log.debug("Refreshing bittensor validators")

      const newData = await fetchAllBittensorValidators(controller.signal)

      lastUpdatedAt = Date.now()
      latestData = newData
      hasEmittedData = true
      subscriber.next({ status: "success", data: newData })
      blobStore.set(newData)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return

      log.error("Failed to fetch bittensor validators", error)
      // On error, keep showing existing data if we have it
      if (hasEmittedData) {
        subscriber.next({ status: "error", data: latestData } as Loadable<BittensorValidator[]>)
      } else {
        subscriber.error(error)
      }
    } finally {
      if (!controller.signal.aborted) timeout = setTimeout(refresh, REFRESH_INTERVAL)
    }
  }

  // Init from storage first (fast), then refresh from network
  blobStore.get().then((blob) => {
    if (blob && blob.length > 0 && !hasEmittedData) {
      latestData = blob
      hasEmittedData = true
      subscriber.next({ status: "success", data: blob })
    }
  })

  // Start the refresh loop
  refresh()
}).pipe(
  startWith({ status: "loading", data: [] } as Loadable<BittensorValidator[]>),
  shareReplay({ bufferSize: 1, refCount: true }),
  keepAlive(2_000) // prevents rapid re-fetching on unsubscriptions
)

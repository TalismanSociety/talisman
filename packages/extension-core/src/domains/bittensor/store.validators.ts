import { keepAlive, Loadable } from "@talismn/util"
import { log, TAOSTATS_BASE_PATH } from "extension-shared"
import { Observable, shareReplay, startWith } from "rxjs"

import { getBlobStore } from "../../db"
import { BittensorValidator } from "./types"

const blobStore = getBlobStore<BittensorValidator[]>("bittensor-validators")

const MAX_PAGE_SIZE = 100
const REFRESH_INTERVAL = 600_000 // 10 mins

let lastUpdatedAt = 0

type Pagination = {
  current_page: number
  per_page: number
  total_items: number
  total_pages: number
  next_page: number | null
  prev_page: number | null
}

type BittensorValidatorsData = {
  pagination: Pagination
  data: BittensorValidator[]
}

const fetchBittensorValidatorsPage = async (
  page: number = 1,
  signal?: AbortSignal,
): Promise<BittensorValidatorsData> => {
  const res = await fetch(
    `${TAOSTATS_BASE_PATH}/api/dtao/validator/latest/v1?page=${page}&limit=${MAX_PAGE_SIZE}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
    },
  )
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return await res.json()
}

const fetchAllBittensorValidators = async (signal?: AbortSignal): Promise<BittensorValidator[]> => {
  const allValidators: BittensorValidator[] = []
  let nextPage: number | null = 1

  while (nextPage !== null) {
    const pageData = await fetchBittensorValidatorsPage(nextPage, signal)
    allValidators.push(...pageData.data)
    nextPage = pageData.pagination.next_page
  }

  return allValidators
}

export const bittensorValidators$ = new Observable<Loadable<BittensorValidator[]>>((subscriber) => {
  const controller = new AbortController()
  subscriber.add(() => controller.abort())

  let timeout: ReturnType<typeof setTimeout> | null = null
  subscriber.add(() => timeout && clearTimeout(timeout))

  let data: BittensorValidator[] = []

  const refresh = async () => {
    try {
      const delay = Math.max(0, lastUpdatedAt + REFRESH_INTERVAL - Date.now())
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (controller.signal.aborted) return

      log.debug("Refreshing bittensor validators")
      subscriber.next({ status: "loading", data })
      data = await fetchAllBittensorValidators(controller.signal)

      lastUpdatedAt = Date.now()
      subscriber.next({ status: "success", data })
      blobStore.set(data)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return

      log.error("Failed to fetch bittensor validators", error)
      if (!subscriber.closed) subscriber.error(error)
    } finally {
      if (!controller.signal.aborted) timeout = setTimeout(refresh, REFRESH_INTERVAL)
    }
  }

  // init loop: fetch from github every 10 mins
  refresh()

  // init from storage
  blobStore.get().then((blob) => {
    subscriber.next({ status: "success", data: blob || [] })
  })
}).pipe(
  startWith({ status: "loading", data: [] }),
  shareReplay({ bufferSize: 1, refCount: true }),
  keepAlive(2_000), // prevents rapid re-fetching on unsubscriptions
)

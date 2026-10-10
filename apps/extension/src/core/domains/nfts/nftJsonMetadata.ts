import { log } from "@common/log"
import { getErrorMessage } from "@talismn/util"
import PQueue from "p-queue"
import { debounceTime, Subject } from "rxjs"

import { getBlobStore } from "../../db/blobs"
import { walletReady } from "../../libs/isWalletReady"

export type NftAttribute = { trait_type: string; value: string | number | boolean }

export type NftJsonMetadata = {
  name?: string
  description?: string
  image?: string
  animation_url?: string
  external_url?: string
  attributes?: NftAttribute[]
}

type CachedJson = { at: number; json: NftJsonMetadata | null }

const FETCH_TIMEOUT = 10_000
const ONE_DAY = 24 * 60 * 60 * 1000
const SUCCESS_TTL = 7 * ONE_DAY
const FAILURE_TTL = ONE_DAY

const queue = new PQueue({ concurrency: 4 })

const blobStore = getBlobStore<Record<string, CachedJson>>("nft-metadata")

const cache = new Map<string, CachedJson>()
const cacheChanged$ = new Subject<void>()

const isFresh = ({ at, json }: CachedJson) => Date.now() - at < (json ? SUCCESS_TTL : FAILURE_TTL)

const freshEntries = (entries: Iterable<[string, CachedJson]>) =>
  [...entries].filter(([, entry]) => isFresh(entry))

const cacheLoaded = walletReady.then(async () => {
  const stored = await blobStore.get()
  for (const [uri, entry] of freshEntries(Object.entries(stored ?? {}))) cache.set(uri, entry)

  cacheChanged$.pipe(debounceTime(1_000)).subscribe(() => {
    blobStore.set(Object.fromEntries(freshEntries(cache)))
  })
})

const rememberInCache = (uri: string, json: NftJsonMetadata | null) => {
  cache.set(uri, { at: Date.now(), json })
  cacheChanged$.next()
}

export const fetchNftJsonMetadata = async (
  uri: string,
  signal: AbortSignal
): Promise<NftJsonMetadata | null> => {
  await cacheLoaded

  const cached = cache.get(uri)
  if (cached && isFresh(cached)) return cached.json

  try {
    const json = await queue.add(() => downloadNftJsonMetadata(uri, signal), { signal })
    rememberInCache(uri, json)
    return json
  } catch (err) {
    signal.throwIfAborted()
    log.warn("[nfts] failed to fetch NFT metadata", { uri, error: getErrorMessage(err) })
    rememberInCache(uri, null)
    return null
  }
}

const downloadNftJsonMetadata = async (uri: string, signal: AbortSignal) => {
  const response = await fetch(uri, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT)]),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const json = parseNftJsonMetadata(await response.json())
  if (!json) throw new Error("NFT metadata is not a JSON object")
  return json
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const optionalString = (value: unknown) => (typeof value === "string" ? value : undefined)

const isAttributeValue = (value: unknown): value is NftAttribute["value"] =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean"

const parseAttributes = (value: unknown): NftAttribute[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((attribute) =>
    isRecord(attribute) &&
    typeof attribute.trait_type === "string" &&
    isAttributeValue(attribute.value)
      ? [{ trait_type: attribute.trait_type, value: attribute.value }]
      : []
  )
}

export const parseNftJsonMetadata = (value: unknown): NftJsonMetadata | null => {
  if (!isRecord(value)) return null
  return {
    name: optionalString(value.name),
    description: optionalString(value.description),
    image: optionalString(value.image),
    animation_url: optionalString(value.animation_url),
    external_url: optionalString(value.external_url),
    attributes: parseAttributes(value.attributes ?? value.traits),
  }
}

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

type FailureKind = "definitive" | "transient"

type CachedJson = { json: NftJsonMetadata | null; attemptedAt: number; nextAttemptAt: number }

const FETCH_TIMEOUT = 10_000
const ONE_MINUTE = 60 * 1000
const ONE_DAY = 24 * 60 * ONE_MINUTE
const SUCCESS_TTL = 7 * ONE_DAY
const RETRY_DELAY: Record<FailureKind, number> = {
  definitive: ONE_DAY,
  transient: 10 * ONE_MINUTE,
}
const KEEP_UNREFERENCED_FOR = 30 * ONE_DAY

const queue = new PQueue({ concurrency: 4 })

const blobStore = getBlobStore<Record<string, CachedJson>>("nft-metadata")

const cache = new Map<string, CachedJson>()
const cacheChanged$ = new Subject<void>()
const inflight = new Map<string, Promise<NftJsonMetadata | null>>()

class MetadataFetchError extends Error {
  constructor(
    message: string,
    readonly kind: FailureKind
  ) {
    super(message)
  }
}

const isCurrent = ({ nextAttemptAt }: CachedJson) => Date.now() < nextAttemptAt

const isCachedJson = (entry: unknown): entry is CachedJson =>
  typeof entry === "object" &&
  entry !== null &&
  typeof (entry as CachedJson).attemptedAt === "number" &&
  typeof (entry as CachedJson).nextAttemptAt === "number"

const keptEntries = (entries: Iterable<[string, unknown]>): [string, CachedJson][] =>
  [...entries].filter(
    (entry): entry is [string, CachedJson] =>
      isCachedJson(entry[1]) && Date.now() - entry[1].attemptedAt < KEEP_UNREFERENCED_FOR
  )

const cacheLoaded = walletReady.then(async () => {
  const stored = await blobStore.get()
  for (const [uri, entry] of keptEntries(Object.entries(stored ?? {}))) cache.set(uri, entry)

  cacheChanged$.pipe(debounceTime(1_000)).subscribe(() => {
    blobStore.set(Object.fromEntries(keptEntries(cache)))
  })
})

const rememberSuccess = (uri: string, json: NftJsonMetadata) => {
  const now = Date.now()
  cache.set(uri, { json, attemptedAt: now, nextAttemptAt: now + SUCCESS_TTL })
  cacheChanged$.next()
}

const rememberFailure = (uri: string, kind: FailureKind) => {
  const now = Date.now()
  const json = cache.get(uri)?.json ?? null
  cache.set(uri, { json, attemptedAt: now, nextAttemptAt: now + RETRY_DELAY[kind] })
  cacheChanged$.next()
}

export const fetchNftJsonMetadata = async (
  uri: string,
  signal: AbortSignal
): Promise<NftJsonMetadata | null> => {
  await cacheLoaded

  const cached = cache.get(uri)
  if (cached && isCurrent(cached)) return cached.json

  const download = inflight.get(uri) ?? startDownload(uri, signal)
  const json = await download
  signal.throwIfAborted()
  return json
}

const startDownload = (uri: string, signal: AbortSignal) => {
  const download = queue
    .add(() => downloadNftJsonMetadata(uri, signal), { signal })
    .then(
      (json) => {
        rememberSuccess(uri, json)
        return json
      },
      (err) => {
        if (signal.aborted) return null
        log.warn("[nfts] failed to fetch NFT metadata", { uri, error: getErrorMessage(err) })
        rememberFailure(uri, err instanceof MetadataFetchError ? err.kind : "transient")
        return cache.get(uri)?.json ?? null
      }
    )
    .finally(() => inflight.delete(uri))
  inflight.set(uri, download)
  return download
}

const isTransientStatus = (status: number) => status === 429 || status >= 500

const downloadNftJsonMetadata = async (uri: string, signal: AbortSignal) => {
  const response = await fetch(uri, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT)]),
  })
  if (!response.ok)
    throw new MetadataFetchError(
      `HTTP ${response.status}`,
      isTransientStatus(response.status) ? "transient" : "definitive"
    )

  const json = parseNftJsonMetadata(await response.json())
  if (!json) throw new MetadataFetchError("NFT metadata is not a JSON object", "definitive")
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

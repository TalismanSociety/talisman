import { log } from "@common/log"
import { getErrorMessage } from "@talismn/util"
import PQueue from "p-queue"
import { debounceTime, ReplaySubject, skip } from "rxjs"

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

type CachedJson = {
  json: NftJsonMetadata | null
  attemptedAt: number
  nextAttemptAt: number
  failures: number
}

const FETCH_TIMEOUT = 10_000
const ONE_MINUTE = 60 * 1000
const ONE_DAY = 24 * 60 * ONE_MINUTE
const SUCCESS_TTL = 7 * ONE_DAY
const TRANSIENT_RETRY_DELAY = 10 * ONE_MINUTE

const getRetryDelay = (kind: FailureKind, failures: number) =>
  kind === "definitive" ? ONE_DAY : Math.min(ONE_DAY, TRANSIENT_RETRY_DELAY * 2 ** (failures - 1))
const KEEP_UNREFERENCED_FOR = 30 * ONE_DAY
const MAX_BODY_BYTES = 256 * 1024
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const MAX_ATTRIBUTES = 50
const MAX_ATTRIBUTE_LENGTH = 100

const queue = new PQueue({ concurrency: 4 })

const blobStore = getBlobStore<Record<string, CachedJson>>("nft-metadata")

const cache = new Map<string, CachedJson>()
const cacheChanged$ = new ReplaySubject<void>(1)
const inflight = new Map<string, Promise<NftJsonMetadata | null>>()

export const nftJsonMetadataChanged$ = cacheChanged$.asObservable()

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
  typeof (entry as CachedJson).nextAttemptAt === "number" &&
  typeof (entry as CachedJson).failures === "number"

const keptEntries = (entries: Iterable<[string, unknown]>): [string, CachedJson][] =>
  [...entries].filter(
    (entry): entry is [string, CachedJson] =>
      isCachedJson(entry[1]) && Date.now() - entry[1].attemptedAt < KEEP_UNREFERENCED_FOR
  )

const cacheLoaded = walletReady.then(async () => {
  const stored = await blobStore.get()
  for (const [uri, entry] of keptEntries(Object.entries(stored ?? {}))) cache.set(uri, entry)
  cacheChanged$.next()

  cacheChanged$.pipe(skip(1), debounceTime(1_000)).subscribe(() => {
    blobStore.set(Object.fromEntries(keptEntries(cache)))
  })
})

const rememberSuccess = (uri: string, json: NftJsonMetadata) => {
  const now = Date.now()
  cache.set(uri, { json, attemptedAt: now, nextAttemptAt: now + SUCCESS_TTL, failures: 0 })
  cacheChanged$.next()
}

const rememberFailure = (uri: string, kind: FailureKind) => {
  const now = Date.now()
  const previous = cache.get(uri)
  const failures = (previous?.failures ?? 0) + 1
  cache.set(uri, {
    json: previous?.json ?? null,
    attemptedAt: now,
    nextAttemptAt: now + getRetryDelay(kind, failures),
    failures,
  })
  cacheChanged$.next()
}

export const getCachedNftJsonMetadata = (uri: string) => cache.get(uri)?.json ?? null

export const fetchNftJsonMetadata = async (
  uri: string,
  signal: AbortSignal,
  priority = 0
): Promise<NftJsonMetadata | null> => {
  await cacheLoaded

  const cached = cache.get(uri)
  if (cached && isCurrent(cached)) return cached.json

  return inflight.get(uri) ?? startDownload(uri, signal, priority)
}

const startDownload = (uri: string, signal: AbortSignal, priority: number) => {
  const download = queue
    .add(() => downloadNftJsonMetadata(uri, signal), { signal, priority })
    .then(
      (json) => {
        rememberSuccess(uri, json)
        return json
      },
      (err) => {
        if (signal.aborted) return getCachedNftJsonMetadata(uri)
        log.warn("[nfts] failed to fetch NFT metadata", { uri, error: getErrorMessage(err) })
        rememberFailure(uri, err instanceof MetadataFetchError ? err.kind : "transient")
        return getCachedNftJsonMetadata(uri)
      }
    )
    .finally(() => inflight.delete(uri))
  inflight.set(uri, download)
  return download
}

const isTransientStatus = (status: number) => status === 429 || status >= 500

const downloadNftJsonMetadata = async (uri: string, signal: AbortSignal) => {
  const response = await fetch(uri, {
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT)]),
  })
  if (!response.ok)
    throw new MetadataFetchError(
      `HTTP ${response.status}`,
      isTransientStatus(response.status) ? "transient" : "definitive"
    )

  const json = parseNftJsonMetadata(parseJson(await readBodyText(response)))
  if (!json) throw new MetadataFetchError("NFT metadata is not a JSON object", "definitive")
  return json
}

const tooLarge = () => new MetadataFetchError("NFT metadata exceeds the size cap", "definitive")

const readBodyText = async (response: Response) => {
  if (Number(response.headers.get("content-length")) > MAX_BODY_BYTES) throw tooLarge()
  const reader = response.body?.getReader()
  if (!reader) return ""

  const decoder = new TextDecoder()
  let text = ""
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      throw tooLarge()
    }
    text += decoder.decode(value, { stream: true })
  }
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    throw new MetadataFetchError("NFT metadata is not valid JSON", "definitive")
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const optionalString = (value: unknown, maxLength = Number.POSITIVE_INFINITY) =>
  typeof value === "string" ? value.slice(0, maxLength) : undefined

const truncateAttributeValue = (value: unknown): NftAttribute["value"] | undefined => {
  if (typeof value === "string") return value.slice(0, MAX_ATTRIBUTE_LENGTH)
  if (typeof value === "number" || typeof value === "boolean") return value
  return undefined
}

const parseAttributes = (value: unknown): NftAttribute[] | undefined => {
  if (!Array.isArray(value)) return undefined
  return value
    .flatMap((attribute) => {
      if (!isRecord(attribute)) return []
      const trait_type = optionalString(attribute.trait_type, MAX_ATTRIBUTE_LENGTH)
      const value = truncateAttributeValue(attribute.value)
      return trait_type !== undefined && value !== undefined ? [{ trait_type, value }] : []
    })
    .slice(0, MAX_ATTRIBUTES)
}

export const parseNftJsonMetadata = (value: unknown): NftJsonMetadata | null => {
  if (!isRecord(value)) return null
  return {
    name: optionalString(value.name, MAX_NAME_LENGTH),
    description: optionalString(value.description, MAX_DESCRIPTION_LENGTH),
    image: optionalString(value.image),
    animation_url: optionalString(value.animation_url),
    external_url: optionalString(value.external_url),
    attributes: parseAttributes(value.attributes ?? value.traits),
  }
}

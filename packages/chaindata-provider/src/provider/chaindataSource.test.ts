import {
  defer,
  filter,
  firstValueFrom,
  type Observable,
  of,
  Subject,
  type Subscription,
  throwError,
  timeout,
} from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeChaindata, makeEthNetwork, makeEvmNativeToken } from "../__fixtures__/chaindata"
import { CHAINDATA_PUB_FOLDER, DEFAULT_CHAINDATA_URL } from "../constants"
import log from "../log"
import { parseChaindataFileChunked } from "../state/chunkedValidation"
import { isNetworkCustom } from "../state/combinedChaindata"
import { getRemoteChaindata$ } from "../state/remoteChaindata"
import type { ChaindataFile } from "../state/schema"
import { ChaindataProvider, type ChaindataProviderOptions } from "./ChaindataProvider"

vi.mock("../state/oldDb", () => ({
  tryToDeleteOldChaindataDb: vi.fn(),
}))

vi.mock("../state/chunkedValidation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../state/chunkedValidation")>()
  return { ...actual, parseChaindataFileChunked: vi.fn(actual.parseChaindataFileChunked) }
})

vi.mock("../log", () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const chaindataA = makeChaindata()
const chaindataB = makeChaindata({
  networks: [makeEthNetwork({ id: "424242", name: "Custom", nativeTokenId: "424242-evm-native" })],
  tokens: [makeEvmNativeToken({ id: "424242-evm-native", networkId: "424242" })],
  miniMetadatas: [],
})

const mockFetch = vi.fn<typeof globalThis.fetch>()
vi.stubGlobal("fetch", mockFetch)

const until = <T>(source$: Observable<T>, predicate: (value: T) => boolean) =>
  firstValueFrom(source$.pipe(filter(predicate), timeout(3_000)))

const ids = (items: { id: string }[]) => items.map(({ id }) => id).sort()

const okResponse = (data: ChaindataFile) => new Response(JSON.stringify(data), { status: 200 })
const errorResponse = () => new Response(null, { status: 500, statusText: "Internal Server Error" })

const subscriptions: Subscription[] = []

const createProvider = (
  options: ChaindataProviderOptions,
  Provider: typeof ChaindataProvider = ChaindataProvider
) => {
  const provider = new Provider(options)
  subscriptions.push(provider.networks$.subscribe())
  return provider
}

afterEach(() => {
  for (const sub of subscriptions.splice(0)) sub.unsubscribe()
  vi.useRealTimers()
})

describe("ChaindataProvider default chaindata", () => {
  const JSDELIVR_URL = `https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@main/${CHAINDATA_PUB_FOLDER}/chaindata.min.json`

  // a fresh module graph per test: the default chaindata source is shared module state
  const createDefaultProvider = async (options: ChaindataProviderOptions = {}) => {
    const { ChaindataProvider } = await import("./ChaindataProvider")
    return createProvider(options, ChaindataProvider)
  }

  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  it("falls back to jsdelivr then to the bundled chaindata when the default file fails", async () => {
    mockFetch.mockImplementation(async () => errorResponse())

    const provider = await createDefaultProvider()
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(networks.length).toBeGreaterThan(0)
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([DEFAULT_CHAINDATA_URL, JSDELIVR_URL])
  })

  it("downloads the default file again after a failed download", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
    mockFetch.mockResolvedValueOnce(errorResponse())
    mockFetch.mockResolvedValueOnce(errorResponse())
    mockFetch.mockImplementation(async () => okResponse(chaindataB))

    const provider = await createDefaultProvider({ persistedStorage: chaindataA })
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    await vi.advanceTimersByTimeAsync(60_000)
    const networks = await until(provider.networks$, (networks) =>
      networks.some(({ id }) => id === "424242")
    )

    expect(ids(networks)).toEqual(ids(chaindataB.networks))
  })
})

describe("ChaindataProvider chaindata$", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.clearAllMocks()
  })

  it("emits the networks and tokens of a provided object and never downloads the default file", async () => {
    const chaindata: ChaindataFile = JSON.parse(JSON.stringify(chaindataA))

    const provider = createProvider({ chaindata$: chaindata })
    const networks = await until(provider.networks$, (networks) => networks.length > 0)
    const tokens = await firstValueFrom(provider.tokens$)

    expect(ids(networks)).toEqual(ids(chaindataA.networks))
    expect(ids(tokens)).toEqual(ids(chaindataA.tokens))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("does not provision the bundled chaindata when the provided source fails", async () => {
    const provider = createProvider({
      chaindata$: throwError(() => new Error("provided source failed")),
    })

    const networks = await firstValueFrom(provider.networks$)

    expect(log.info).not.toHaveBeenCalledWith(
      "[defaultChaindata$] Importing initial chaindata file"
    )
    expect(networks).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("replaces the data when the provided observable emits again", async () => {
    const chaindata$ = new Subject<ChaindataFile>()
    const provider = createProvider({ chaindata$ })

    chaindata$.next(chaindataA)
    const networksA = await until(provider.networks$, (networks) => networks.length > 0)
    chaindata$.next(chaindataB)
    const networksB = await until(provider.networks$, (networks) =>
      networks.some(({ id }) => id === "424242")
    )

    expect(ids(networksA)).toEqual(ids(chaindataA.networks))
    expect(ids(networksB)).toEqual(ids(chaindataB.networks))
  })

  it("keeps the previous data when the provided observable emits invalid data", async () => {
    const chaindata$ = new Subject<ChaindataFile>()
    const provider = createProvider({ chaindata$ })
    chaindata$.next(chaindataA)
    await until(provider.networks$, (networks) => networks.length > 0)

    chaindata$.next({ ...chaindataB, tokens: [] })
    await vi.waitFor(() =>
      expect(log.error).toHaveBeenCalledWith(
        "[defaultChaindata$] Invalid chaindata provided",
        expect.anything()
      )
    )

    expect(ids(await firstValueFrom(provider.networks$))).toEqual(ids(chaindataA.networks))
    expect(ids((await firstValueFrom(provider.storage$)).networks)).toEqual(
      ids(chaindataA.networks)
    )
  })

  it("logs the failure and subscribes again to the provided observable after it fails", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
    let attempts = 0
    const chaindata$ = defer(() =>
      attempts++ === 0 ? throwError(() => new Error("provided source failed")) : of(chaindataA)
    )

    const provider = createProvider({ chaindata$ })
    await vi.advanceTimersByTimeAsync(60_000)
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(ids(networks)).toEqual(ids(chaindataA.networks))
    expect(attempts).toBe(2)
    expect(log.error).toHaveBeenCalledWith("[defaultChaindata$] Provided chaindata failed", {
      cause: new Error("provided source failed"),
    })
  })

  it("restores the persisted data before the provided observable emits", async () => {
    const chaindata$ = new Subject<ChaindataFile>()
    const provider = createProvider({ chaindata$, persistedStorage: chaindataA })

    const persisted = await until(provider.networks$, (networks) => networks.length > 0)
    chaindata$.next(chaindataB)
    const provided = await until(provider.networks$, (networks) =>
      networks.some(({ id }) => id === "424242")
    )

    expect(ids(persisted)).toEqual(ids(chaindataA.networks))
    expect(ids(provided)).toEqual(ids(chaindataB.networks))
  })

  it("merges custom chaindata on top of the provided data", async () => {
    const provider = createProvider({
      chaindata$: chaindataA,
      customChaindata$: { networks: chaindataB.networks, tokens: chaindataB.tokens },
    })

    const networks = await until(provider.networks$, (networks) =>
      networks.some(({ id }) => id === "424242")
    )

    expect(ids(networks)).toEqual(ids([...chaindataA.networks, ...chaindataB.networks]))
    expect(networks.filter(isNetworkCustom).map(({ id }) => id)).toEqual(["424242"])
  })

  it("validates a provided object once across resubscriptions", async () => {
    const chaindata: ChaindataFile = JSON.parse(JSON.stringify(chaindataA))
    const provider = new ChaindataProvider({ chaindata$: chaindata })
    const parsedInputs = () =>
      vi.mocked(parseChaindataFileChunked).mock.calls.filter(([input]) => input === chaindata)

    for (let i = 0; i < 2; i++) {
      const subscription = provider.networks$.subscribe()
      await until(provider.networks$, (networks) => networks.length > 0)
      subscription.unsubscribe()
    }

    expect(parsedInputs()).toHaveLength(1)
  })

  it("downloads the chaindata file of a url given through getRemoteChaindata$", async () => {
    const url = "https://example.com/chaindata.min.json"
    mockFetch.mockImplementation(async () => new Response(JSON.stringify(chaindataB)))

    const provider = createProvider({ chaindata$: getRemoteChaindata$(url) })
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(ids(networks)).toEqual(ids(chaindataB.networks))
    expect(mockFetch.mock.calls.map(([requested]) => requested)).toEqual([url])
  })
})

import { filter, firstValueFrom, type Observable, type Subscription, timeout } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeChaindata, makeEthNetwork, makeEvmNativeToken } from "../__fixtures__/chaindata"
import { CHAINDATA_PUB_FOLDER, DEFAULT_CHAINDATA_URL } from "../constants"
import type { Chaindata } from "../state/schema"
import type { ChaindataProviderOptions } from "./ChaindataProvider"

vi.mock("../state/oldDb", () => ({
  tryToDeleteOldChaindataDb: vi.fn(),
}))

const CUSTOM_URL_A =
  "https://raw.githubusercontent.com/TalismanSociety/signet/main/chaindata.min.json"
const CUSTOM_URL_B = "https://example.com/chaindata.min.json"
const JSDELIVR_URL = `https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@main/${CHAINDATA_PUB_FOLDER}/chaindata.min.json`

const chaindataA = makeChaindata()
const chaindataB = makeChaindata({
  networks: [makeEthNetwork({ id: "424242", name: "Custom", nativeTokenId: "424242-evm-native" })],
  tokens: [makeEvmNativeToken({ id: "424242-evm-native", networkId: "424242" })],
  miniMetadatas: [],
})

const mockFetch = vi.fn<typeof globalThis.fetch>()
vi.stubGlobal("fetch", mockFetch)

const okResponse = (data: Chaindata) => new Response(JSON.stringify(data), { status: 200 })
const errorResponse = () => new Response(null, { status: 500, statusText: "Internal Server Error" })

const until = <T>(source$: Observable<T>, predicate: (value: T) => boolean) =>
  firstValueFrom(source$.pipe(filter(predicate), timeout(3_000)))

const networkIds = (networks: { id: string }[]) => networks.map(({ id }) => id).sort()

const subscriptions: Subscription[] = []

const createProvider = async (options: ChaindataProviderOptions = {}) => {
  const { ChaindataProvider } = await import("./ChaindataProvider")
  const provider = new ChaindataProvider(options)
  subscriptions.push(provider.networks$.subscribe())
  return provider
}

describe("ChaindataProvider chaindataUrl", () => {
  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
  })

  afterEach(() => {
    for (const sub of subscriptions.splice(0)) sub.unsubscribe()
    vi.useRealTimers()
  })

  it("downloads the custom file and never the default one", async () => {
    mockFetch.mockImplementation(async () => okResponse(chaindataA))

    const provider = await createProvider({ chaindataUrl: CUSTOM_URL_A })
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(networkIds(networks)).toEqual(networkIds(chaindataA.networks))
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([CUSTOM_URL_A])
  })

  it("does not fall back to jsdelivr nor to the bundled chaindata when the custom file fails", async () => {
    mockFetch.mockImplementation(async () => errorResponse())

    const provider = await createProvider({ chaindataUrl: CUSTOM_URL_A })
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([CUSTOM_URL_A])
    expect(await firstValueFrom(provider.networks$)).toEqual([])
  })

  it("keeps the default file, its jsdelivr fallback and the bundled chaindata without the option", async () => {
    mockFetch.mockImplementation(async () => errorResponse())

    const provider = await createProvider()
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(networks.length).toBeGreaterThan(0)
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([DEFAULT_CHAINDATA_URL, JSDELIVR_URL])
  })

  it("gives two providers with different urls their own data", async () => {
    mockFetch.mockImplementation(async (url) =>
      okResponse(url === CUSTOM_URL_A ? chaindataA : chaindataB)
    )

    const providerA = await createProvider({ chaindataUrl: CUSTOM_URL_A })
    const providerB = await createProvider({ chaindataUrl: CUSTOM_URL_B })
    const [networksA, networksB] = await Promise.all([
      until(providerA.networks$, (networks) => networks.length > 0),
      until(providerB.networks$, (networks) => networks.length > 0),
    ])

    expect(networkIds(networksA)).toEqual(networkIds(chaindataA.networks))
    expect(networkIds(networksB)).toEqual(networkIds(chaindataB.networks))
  })

  it("downloads the custom file again after a failed download", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    mockFetch.mockResolvedValueOnce(errorResponse())
    mockFetch.mockImplementation(async () => okResponse(chaindataA))

    const provider = await createProvider({ chaindataUrl: CUSTOM_URL_A })
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    await vi.advanceTimersByTimeAsync(60_000)
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(networkIds(networks)).toEqual(networkIds(chaindataA.networks))
  })

  it("restores the persisted data of the same custom file", async () => {
    mockFetch.mockImplementation(async () => okResponse(chaindataA))
    const downloader = await createProvider({ chaindataUrl: CUSTOM_URL_A })
    await until(downloader.networks$, (networks) => networks.length > 0)
    const persistedStorage = await firstValueFrom(downloader.storage$)

    mockFetch.mockImplementation(async () => errorResponse())
    const provider = await createProvider({ chaindataUrl: CUSTOM_URL_A, persistedStorage })

    expect(networkIds(await firstValueFrom(provider.networks$))).toEqual(
      networkIds(chaindataA.networks)
    )
  })

  it("ignores the persisted data of another custom file", async () => {
    mockFetch.mockImplementation(async () => okResponse(chaindataB))
    const downloader = await createProvider({ chaindataUrl: CUSTOM_URL_B })
    await until(downloader.networks$, (networks) => networks.length > 0)
    const persistedStorage = await firstValueFrom(downloader.storage$)

    mockFetch.mockImplementation(async () => errorResponse())
    const provider = await createProvider({ chaindataUrl: CUSTOM_URL_A, persistedStorage })
    await vi.waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith(CUSTOM_URL_A, expect.anything())
    )

    expect(await firstValueFrom(provider.networks$)).toEqual([])
  })

  it("ignores the persisted default chaindata for a custom file", async () => {
    mockFetch.mockImplementation(async () => errorResponse())

    const provider = await createProvider({
      chaindataUrl: CUSTOM_URL_A,
      persistedStorage: chaindataB,
    })
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled())

    expect(await firstValueFrom(provider.networks$)).toEqual([])
  })

  it("ignores the persisted data of a custom file without the option", async () => {
    mockFetch.mockImplementation(async () => okResponse(chaindataB))
    const downloader = await createProvider({ chaindataUrl: CUSTOM_URL_B })
    await until(downloader.networks$, (networks) => networks.length > 0)
    const persistedStorage = await firstValueFrom(downloader.storage$)

    mockFetch.mockImplementation(async () => errorResponse())
    const provider = await createProvider({ persistedStorage })
    const networks = await until(provider.networks$, (networks) => networks.length > 0)

    expect(networkIds(networks)).not.toContain("424242")
  })

  it.each(["", "chaindata.min.json"])("rejects the invalid url %j", async (chaindataUrl) => {
    await expect(createProvider({ chaindataUrl })).rejects.toThrow(chaindataUrl || "chaindataUrl")
  })
})

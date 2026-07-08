import { normalizeAddress } from "@talismn/crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestAuthoriseSite } from "../sitesAuthorised/requests"
import type { AuthorizedSite } from "../sitesAuthorised/types"
import { ETH_ERROR_EIP1474_INVALID_PARAMS, EthProviderRpcError } from "./EthProviderRpcError"
import { EthTabsHandler } from "./handler.tabs"

// keep the real ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE, only stub the network-facing request
vi.mock("../sitesAuthorised/requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../sitesAuthorised/requests")>()),
  requestAuthoriseSite: vi.fn().mockResolvedValue(undefined),
}))

const URL = "https://app.uniswap.org/swap"
const ADDRESS = normalizeAddress("0x1111111111111111111111111111111111111111")
const port = {} as never

type FakeSites = {
  getSiteFromUrl: ReturnType<typeof vi.fn>
  updateSite: ReturnType<typeof vi.fn>
}

const makeHandler = (site?: Partial<AuthorizedSite> | null) => {
  const sites: FakeSites = {
    getSiteFromUrl: vi.fn().mockResolvedValue(site ?? null),
    updateSite: vi.fn().mockResolvedValue(undefined),
  }
  const stores = {
    sites,
    settings: { get: vi.fn().mockResolvedValue(false) },
    app: { ensureOnboarded: vi.fn().mockResolvedValue(undefined) },
  }
  // biome-ignore lint/suspicious/noExplicitAny: injecting fake stores to unit-test private handler methods
  const handler = new EthTabsHandler(stores as any) as any
  return { handler, sites }
}

const site = (props: Partial<AuthorizedSite> = {}): Partial<AuthorizedSite> => ({
  id: "app.uniswap.org",
  url: URL,
  ethChainId: 1,
  ethAddresses: [ADDRESS],
  ...props,
})

beforeEach(() => {
  vi.mocked(requestAuthoriseSite).mockClear()
  vi.mocked(requestAuthoriseSite).mockResolvedValue(undefined)
})

describe("authoriseEth (reconnect / Gap 6)", () => {
  it("returns true without prompting when the site already has connected accounts", async () => {
    const { handler } = makeHandler(site())
    await expect(
      handler.authoriseEth(URL, { origin: "", provider: "ethereum" }, port)
    ).resolves.toBe(true)
    expect(requestAuthoriseSite).not.toHaveBeenCalled()
  })

  it("re-prompts when ethAddresses is empty (disconnected/revoked site can reconnect)", async () => {
    const { handler } = makeHandler(site({ ethAddresses: [] }))
    await expect(
      handler.authoriseEth(URL, { origin: "", provider: "ethereum" }, port)
    ).resolves.toBe(true)
    expect(requestAuthoriseSite).toHaveBeenCalledOnce()
  })

  it("always prompts when force is set, even for an already-connected site", async () => {
    const { handler } = makeHandler(site())
    await expect(
      handler.authoriseEth(URL, { origin: "", provider: "ethereum" }, port, true)
    ).resolves.toBe(true)
    expect(requestAuthoriseSite).toHaveBeenCalledOnce()
  })

  it("returns false when the url cannot be resolved to a site", async () => {
    const { handler, sites } = makeHandler()
    sites.getSiteFromUrl.mockRejectedValue(new Error("Invalid URL"))
    await expect(
      handler.authoriseEth(URL, { origin: "", provider: "ethereum" }, port)
    ).resolves.toBe(false)
    expect(requestAuthoriseSite).not.toHaveBeenCalled()
  })
})

describe("sendTransaction (unsupported tx types)", () => {
  const send = (handler: unknown, txRequest: Record<string, unknown>) =>
    // biome-ignore lint/suspicious/noExplicitAny: private method under test
    (handler as any).sendTransaction(URL, { params: [txRequest] }, port)

  it("rejects EIP-7702 transactions (authorizationList)", async () => {
    const { handler } = makeHandler(site())
    await expect(send(handler, { from: ADDRESS, authorizationList: [] })).rejects.toMatchObject({
      code: ETH_ERROR_EIP1474_INVALID_PARAMS,
      message: expect.stringContaining("7702"),
    })
  })

  it("rejects EIP-4844 blob transactions", async () => {
    const { handler } = makeHandler(site())
    await expect(
      send(handler, { from: ADDRESS, blobVersionedHashes: ["0x00"] })
    ).rejects.toMatchObject({
      code: ETH_ERROR_EIP1474_INVALID_PARAMS,
      message: expect.stringContaining("4844"),
    })
  })

  it("rejects transaction types >= 3", async () => {
    const { handler } = makeHandler(site())
    await expect(send(handler, { from: ADDRESS, type: "0x3" })).rejects.toMatchObject({
      code: ETH_ERROR_EIP1474_INVALID_PARAMS,
      message: expect.stringContaining("type"),
    })
  })
})

describe("getPermissions", () => {
  it("returns [] for an unknown site", async () => {
    const { handler } = makeHandler(null)
    await expect(handler.getPermissions(URL)).resolves.toEqual([])
  })

  it("returns eth_accounts with a restrictReturnedAccounts caveat", async () => {
    const { handler } = makeHandler(
      site({ ethPermissions: { eth_accounts: { id: "grant-1", date: 123 } } })
    )
    handler.accountsList = vi.fn().mockResolvedValue([ADDRESS.toLowerCase()])

    const [perm, ...rest] = await handler.getPermissions(URL)
    expect(rest).toHaveLength(0)
    expect(perm).toMatchObject({
      id: "grant-1",
      parentCapability: "eth_accounts",
      invoker: "https://app.uniswap.org",
      date: 123,
      caveats: [{ type: "restrictReturnedAccounts", value: [ADDRESS.toLowerCase()] }],
    })
  })

  it("self-heals missing grant metadata (id & date) with a single store write", async () => {
    const { handler, sites } = makeHandler(site({ ethPermissions: undefined }))
    handler.accountsList = vi.fn().mockResolvedValue([ADDRESS.toLowerCase()])

    const [perm] = await handler.getPermissions(URL)
    expect(perm.id).toEqual(expect.any(String))
    expect(perm.date).toEqual(expect.any(Number))
    expect(sites.updateSite).toHaveBeenCalledOnce()
    expect(sites.updateSite).toHaveBeenCalledWith("app.uniswap.org", {
      ethPermissions: { eth_accounts: { id: perm.id, date: perm.date } },
    })
  })

  it("falls back to the raw stored url when it is not a valid absolute URL", async () => {
    const { handler } = makeHandler(
      site({ url: "app.uniswap.org", ethPermissions: { eth_accounts: { id: "g", date: 1 } } })
    )
    handler.accountsList = vi.fn().mockResolvedValue([ADDRESS.toLowerCase()])

    const [perm] = await handler.getPermissions(URL)
    expect(perm.invoker).toBe("app.uniswap.org")
  })
})

describe("revokePermissions", () => {
  const revoke = (handler: unknown, params: unknown[]) =>
    // biome-ignore lint/suspicious/noExplicitAny: private method under test
    (handler as any).revokePermissions(URL, { params })

  it("clears ethAddresses and removes the eth_accounts permission", async () => {
    const { handler, sites } = makeHandler(
      site({ ethPermissions: { eth_accounts: { id: "g", date: 1 } } })
    )
    await expect(revoke(handler, [{ eth_accounts: {} }])).resolves.toBeNull()
    expect(sites.updateSite).toHaveBeenCalledWith("app.uniswap.org", {
      ethAddresses: [],
      ethPermissions: {},
    })
  })

  it("returns null without writing for a not-connected site", async () => {
    const { handler, sites } = makeHandler(null)
    await expect(revoke(handler, [{ eth_accounts: {} }])).resolves.toBeNull()
    expect(sites.updateSite).not.toHaveBeenCalled()
  })

  it("throws on malformed params", async () => {
    const { handler } = makeHandler(site())
    await expect(revoke(handler, [])).rejects.toBeInstanceOf(EthProviderRpcError)
    await expect(revoke(handler, [{}])).rejects.toBeInstanceOf(EthProviderRpcError)
  })
})

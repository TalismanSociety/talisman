import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type SubForeignAssetsToken, subForeignAssetTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import type { IBalance } from "../../types"
import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { polkadotAssetHub as fixture } from "./__fixtures__/polkadotAssetHub"
import { fetchBalances } from "./fetchBalances"
import { getMiniMetadata } from "./getMiniMetadata"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

const NETWORK_ID = "polkadot-asset-hub"

const FIXTURES_DIR = path.resolve(
  import.meta.dirname,
  "../../../../../apps/extension/tests/fixtures"
)
const MINI_METADATA = getMiniMetadata({
  networkId: NETWORK_ID,
  specVersion: 2003001,
  metadataRpc: `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, fixture.source.metadataFixture))).toString("hex")}`,
})

type Holder = (typeof fixture.holders)[number]

const holder = (label: string): Holder => {
  const found = fixture.holders.find((h) => h.label === label)
  if (!found) throw new Error(`no holder ${label}`)
  return found
}
const ethHolder = holder("ethHolder")
const wethHolder = holder("wethHolder")
const vdotHolder = holder("vdotHolder")
const wethEmptyAccount = holder("wethEmptyAccount")

/** onChainId strings are the chaindata ones, verbatim */
const foreignToken = (
  onChainId: string,
  overrides: Partial<SubForeignAssetsToken> = {}
): SubForeignAssetsToken => ({
  id: subForeignAssetTokenId(NETWORK_ID, onChainId),
  type: "substrate-foreignassets",
  platform: "polkadot",
  networkId: NETWORK_ID,
  onChainId,
  symbol: "FOREIGN",
  decimals: 18,
  isSufficient: false,
  existentialDeposit: "1",
  ...overrides,
})
const ETH = foreignToken(ethHolder.onChainId)
const WETH = foreignToken(wethHolder.onChainId)
const VDOT = foreignToken(vdotHolder.onChainId)

/** a node serving the captured storage: state_queryStorageAt answers every key, null when absent */
const makeConnector = (overrides: Record<string, string | null> = {}) => {
  const storage = new Map<string, string | null>(
    fixture.holders.map(({ entry }) => [entry.key, entry.value])
  )
  for (const [key, value] of Object.entries(overrides)) storage.set(key, value)

  const send = vi.fn(async (_networkId: string, method: string, params: unknown[]) => {
    if (method !== "state_queryStorageAt") throw new Error(`unexpected rpc ${method}`)
    const [keys] = params as [string[]]
    return [
      {
        block: fixture.source.blockHash,
        changes: keys.map((key) => [key, storage.get(key) ?? null]),
      },
    ]
  })
  return { connector: { send } as unknown as IChainConnectorDot, send }
}

const fetchForeign = (
  tokensWithAddresses: TokensWithAddresses,
  connector: IChainConnectorDot,
  miniMetadata = MINI_METADATA
) => fetchBalances({ networkId: NETWORK_ID, tokensWithAddresses, connector, miniMetadata })

/** the balance minus `source`, which is pinned separately (see the it.fails below) */
const foreignBalance = (
  token: SubForeignAssetsToken,
  address: string,
  { free, frozen }: { free: string; frozen: string }
): Omit<IBalance, "source"> => ({
  status: "live",
  address,
  networkId: NETWORK_ID,
  tokenId: token.id,
  values: [
    { type: "free", label: "free", amount: free },
    { type: "locked", label: "frozen", amount: frozen },
  ],
})
const withoutSource = (balances: IBalance[]) => balances.map(({ source: _, ...rest }) => rest)

const balanceOf = (h: Holder) => h.entry.expected?.balance ?? "0"

describe("substrate-foreignassets fetchBalances", () => {
  it("encodes XCM locations from chaindata into the exact state keys and decodes their balances", async () => {
    const { connector, send } = makeConnector()

    const result = await fetchForeign(
      [
        [ETH, [ethHolder.address]],
        [WETH, [wethHolder.address, wethEmptyAccount.address]],
        [VDOT, [vdotHolder.address]],
      ],
      connector
    )

    expect(result.errors).toEqual([])
    expect(withoutSource(result.success)).toEqual([
      foreignBalance(ETH, ethHolder.address, { free: balanceOf(ethHolder), frozen: "0" }),
      foreignBalance(WETH, wethHolder.address, { free: balanceOf(wethHolder), frozen: "0" }),
      foreignBalance(WETH, wethEmptyAccount.address, { free: "0", frozen: "0" }),
      foreignBalance(VDOT, vdotHolder.address, { free: balanceOf(vdotHolder), frozen: "0" }),
    ])
    // X1 GlobalConsensus, X2 AccountKey20 without `network`, X2 GeneralKey with fixed-size data
    expect(send.mock.calls).toEqual([
      [
        NETWORK_ID,
        "state_queryStorageAt",
        [[ethHolder, wethHolder, wethEmptyAccount, vdotHolder].map(({ entry }) => entry.key)],
      ],
    ])
  })

  it("reports a Frozen account's whole balance as frozen", async () => {
    const { frozen } = fixture.handEncoded
    const { connector } = makeConnector({ [wethHolder.entry.key]: frozen.value })

    const { success } = await fetchForeign([[WETH, [wethHolder.address]]], connector)

    expect(frozen.expected.status.type).toBe("Frozen")
    expect(withoutSource(success)).toEqual([
      foreignBalance(WETH, wethHolder.address, {
        free: frozen.expected.balance,
        frozen: frozen.expected.balance,
      }),
    ])
  })

  it("reports a Blocked account's whole balance as frozen", async () => {
    const { blocked } = fixture.handEncoded
    const { connector } = makeConnector({ [wethHolder.entry.key]: blocked.value })

    const { success } = await fetchForeign([[WETH, [wethHolder.address]]], connector)

    expect(blocked.expected.status.type).toBe("Blocked")
    expect(withoutSource(success)).toEqual([
      foreignBalance(WETH, wethHolder.address, {
        free: blocked.expected.balance,
        frozen: blocked.expected.balance,
      }),
    ])
  })

  it("reports the whole balance as frozen when the token is frozen", async () => {
    const { connector } = makeConnector()
    const frozenWeth = foreignToken(wethHolder.onChainId, { isFrozen: true })

    const { success } = await fetchForeign([[frozenWeth, [wethHolder.address]]], connector)

    expect(withoutSource(success)).toEqual([
      foreignBalance(frozenWeth, wethHolder.address, {
        free: balanceOf(wethHolder),
        frozen: balanceOf(wethHolder),
      }),
    ])
  })

  it("labels decoded balances with the substrate-assets source (current behaviour)", async () => {
    const { connector } = makeConnector()

    const { success } = await fetchForeign([[WETH, [wethHolder.address]]], connector)

    expect(success.map(({ source }) => source)).toEqual(["substrate-assets"])
  })

  // BUG: buildQueries copies substrate-assets' `source`, while this module's own zero-balance
  // fallback (and the token type) say substrate-foreignassets
  it.fails("labels decoded balances with the substrate-foreignassets source", async () => {
    const { connector } = makeConnector()

    const { success } = await fetchForeign([[WETH, [wethHolder.address]]], connector)

    expect(success.map(({ source }) => source)).toEqual(["substrate-foreignassets"])
  })

  it.each([
    ["an unencodable address", WETH, "not-an-address"],
    ["an onChainId that is not a location", foreignToken("not-json"), wethHolder.address],
  ])("falls back to a zero balance without querying for %s", async (_, token, address) => {
    const { connector, send } = makeConnector()

    const result = await fetchForeign([[token, [address]]], connector)

    expect(result).toEqual({
      success: [
        {
          ...foreignBalance(token, address, { free: "0", frozen: "0" }),
          source: "substrate-foreignassets",
        },
      ],
      errors: [],
    })
    expect(send).not.toHaveBeenCalled()
  })

  describe("rejects an unusable miniMetadata with one error per address", () => {
    it.each([
      ["no data", { data: null }, "Minimetadata is required for fetching balances"],
      [
        "another module's source",
        { source: "substrate-assets" },
        "Invalid request: miniMetadata source is not substrate-foreignassets",
      ],
      [
        "another chain",
        { chainId: "kusama-asset-hub" },
        `Invalid request: Expected chainId is ${NETWORK_ID}`,
      ],
    ] as const)("%s", async (_, override, message) => {
      const { connector, send } = makeConnector()

      const result = await fetchForeign(
        [[WETH, [wethHolder.address, ethHolder.address]]],
        connector,
        { ...MINI_METADATA, ...override }
      )

      expect(result).toEqual({
        success: [],
        errors: [
          { tokenId: WETH.id, address: wethHolder.address, error: new Error(message) },
          { tokenId: WETH.id, address: ethHolder.address, error: new Error(message) },
        ],
      })
      expect(send).not.toHaveBeenCalled()
    })
  })
})

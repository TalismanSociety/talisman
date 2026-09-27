import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { Blake2128Concat, u32 } from "@polkadot-api/substrate-bindings"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import {
  MINIMETADATA_VERSION,
  type SubAssetsToken,
  subAssetTokenId,
} from "@talismn/chaindata-provider"
import { toHex } from "@talismn/scale"
import { describe, expect, it, vi } from "vitest"

import { deriveMiniMetadataId, type IBalance, type MiniMetadata } from "../../types"
import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { astar } from "./__fixtures__/astar"
import { polkadotAssetHub as fixture } from "./__fixtures__/polkadotAssetHub"
import { fetchBalances } from "./fetchBalances"
import { getMiniMetadata } from "./getMiniMetadata"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

const ASSET_HUB = "polkadot-asset-hub"
const ASTAR = "astar"

const FIXTURES_DIR = path.resolve(
  import.meta.dirname,
  "../../../../../apps/extension/tests/fixtures"
)
const ASSET_HUB_MINI_METADATA = getMiniMetadata({
  networkId: ASSET_HUB,
  specVersion: 2003001,
  metadataRpc: `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, fixture.source.metadataFixture))).toString("hex")}`,
})
const ASTAR_MINI_METADATA: MiniMetadata = {
  id: deriveMiniMetadataId({
    source: "substrate-assets",
    chainId: ASTAR,
    specVersion: astar.source.specVersion,
  }),
  source: "substrate-assets",
  chainId: ASTAR,
  specVersion: astar.source.specVersion,
  version: MINIMETADATA_VERSION,
  data: astar.miniMetadata.data as `0x${string}`,
  extra: null,
}

type Holder = {
  label: string
  assetId: string
  address: string
  entry: Entry
  assetStatus?: string | null
}
type Entry = { key: string; value: string | null; expected: { balance: string } | null }

const holder = (label: string): Holder => {
  const found = [...fixture.holders, ...astar.holders].find((h) => h.label === label)
  if (!found) throw new Error(`no holder ${label}`)
  return found
}
const usdtHolderA = holder("usdtHolderA")
const usdtHolderB = holder("usdtHolderB")
const usdtEmptyAccount = holder("usdtEmptyAccount")
const frozenAccount = holder("frozenAccount")
const frozenAssetHolder = holder("frozenAssetHolder")
const acaHolder = holder("acaHolder")
const xcDotHolder = holder("xcDotHolder")

const assetToken = (
  networkId: string,
  assetId: string,
  overrides: Partial<SubAssetsToken> = {}
): SubAssetsToken => ({
  id: subAssetTokenId(networkId, assetId),
  type: "substrate-assets",
  platform: "polkadot",
  networkId,
  assetId,
  symbol: `ASSET${assetId}`,
  decimals: 10,
  isSufficient: true,
  existentialDeposit: "1",
  ...overrides,
})
const USDT = assetToken(ASSET_HUB, "1984")

/** a node serving the captured storage: state_queryStorageAt answers every key, null when absent */
const makeConnector = (overrides: Record<string, string | null> = {}) => {
  const storage = new Map<string, string | null>(
    [...fixture.holders, ...astar.holders].map(({ entry }) => [entry.key, entry.value])
  )
  for (const [key, value] of Object.entries(overrides)) storage.set(key, value)

  const send = vi.fn(async (_networkId: string, method: string, params: unknown[]) => {
    if (method !== "state_queryStorageAt") throw new Error(`unexpected rpc ${method}`)
    const [keys] = params as [string[]]
    return [{ block: "0x00", changes: keys.map((key) => [key, storage.get(key) ?? null]) }]
  })
  return { connector: { send } as unknown as IChainConnectorDot, send }
}

const fetchAssets = (
  tokensWithAddresses: TokensWithAddresses,
  connector: IChainConnectorDot,
  { networkId = ASSET_HUB, miniMetadata = ASSET_HUB_MINI_METADATA } = {}
) => fetchBalances({ networkId, tokensWithAddresses, connector, miniMetadata })

const assetBalance = (
  token: SubAssetsToken,
  address: string,
  { free, frozen }: { free: string; frozen: string }
): IBalance => ({
  source: "substrate-assets",
  status: "live",
  address,
  networkId: token.networkId,
  tokenId: token.id,
  values: [
    { type: "free", label: "free", amount: free },
    { type: "locked", label: "frozen", amount: frozen },
  ],
})

const balanceOf = (h: Holder) => h.entry.expected?.balance ?? "0"

describe("substrate-assets fetchBalances", () => {
  it("decodes balances of several tokens and addresses from their exact state keys", async () => {
    const { connector, send } = makeConnector()
    const frozenAccountToken = assetToken(ASSET_HUB, frozenAccount.assetId)

    const result = await fetchAssets(
      [
        [USDT, [usdtHolderA.address, usdtHolderB.address, usdtEmptyAccount.address]],
        [frozenAccountToken, [frozenAccount.address]],
      ],
      connector
    )

    expect(result).toEqual({
      success: [
        assetBalance(USDT, usdtHolderA.address, { free: balanceOf(usdtHolderA), frozen: "0" }),
        assetBalance(USDT, usdtHolderB.address, { free: balanceOf(usdtHolderB), frozen: "0" }),
        assetBalance(USDT, usdtEmptyAccount.address, { free: "0", frozen: "0" }),
        assetBalance(frozenAccountToken, frozenAccount.address, {
          free: balanceOf(frozenAccount),
          frozen: balanceOf(frozenAccount),
        }),
      ],
      errors: [],
    })
    expect(send.mock.calls).toEqual([
      [
        ASSET_HUB,
        "state_queryStorageAt",
        [[usdtHolderA, usdtHolderB, usdtEmptyAccount, frozenAccount].map(({ entry }) => entry.key)],
      ],
    ])
  })

  it("reports a Frozen account's whole balance as frozen", async () => {
    const { connector } = makeConnector()
    const token = assetToken(ASSET_HUB, frozenAccount.assetId)

    const { success } = await fetchAssets([[token, [frozenAccount.address]]], connector)

    expect(frozenAccount.entry.expected).toMatchObject({ status: { type: "Frozen" } })
    expect(success).toEqual([
      assetBalance(token, frozenAccount.address, {
        free: balanceOf(frozenAccount),
        frozen: balanceOf(frozenAccount),
      }),
    ])
  })

  it("reports the whole balance as frozen when the token is frozen", async () => {
    const { connector } = makeConnector()
    const token = assetToken(ASSET_HUB, frozenAssetHolder.assetId, { isFrozen: true })

    const { success } = await fetchAssets([[token, [frozenAssetHolder.address]]], connector)

    // the account itself is liquid: only the asset is frozen
    expect(frozenAssetHolder.entry.expected).toMatchObject({ status: { type: "Liquid" } })
    expect(frozenAssetHolder.assetStatus).toBe("Frozen")
    expect(success).toEqual([
      assetBalance(token, frozenAssetHolder.address, {
        free: balanceOf(frozenAssetHolder),
        frozen: balanceOf(frozenAssetHolder),
      }),
    ])
  })

  // a Blocked account can neither send nor receive, but only the Frozen status locks the balance
  it.fails("reports a Blocked account's whole balance as frozen", async () => {
    const { blocked } = fixture.handEncoded
    const { connector } = makeConnector({ [frozenAccount.entry.key]: blocked.value })
    const token = assetToken(ASSET_HUB, frozenAccount.assetId)

    const { success } = await fetchAssets([[token, [frozenAccount.address]]], connector)

    expect(blocked.expected.status.type).toBe("Blocked")
    expect(success).toEqual([
      assetBalance(token, frozenAccount.address, {
        free: blocked.expected.balance,
        frozen: blocked.expected.balance,
      }),
    ])
  })

  it("encodes Astar u128 asset ids as bigints", async () => {
    const { connector, send } = makeConnector()
    const aca = assetToken(ASTAR, acaHolder.assetId)
    const xcDot = assetToken(ASTAR, xcDotHolder.assetId)

    const { success } = await fetchAssets(
      [
        [aca, [acaHolder.address]],
        [xcDot, [xcDotHolder.address]],
      ],
      connector,
      { networkId: ASTAR, miniMetadata: ASTAR_MINI_METADATA }
    )

    expect(success).toEqual([
      assetBalance(aca, acaHolder.address, { free: balanceOf(acaHolder), frozen: "0" }),
      assetBalance(xcDot, xcDotHolder.address, { free: balanceOf(xcDotHolder), frozen: "0" }),
    ])
    expect(send.mock.calls).toEqual([
      [ASTAR, "state_queryStorageAt", [[acaHolder.entry.key, xcDotHolder.entry.key]]],
    ])
  })

  it("queries asset 0 for a non-numeric assetId on a u32 chain (current behaviour)", async () => {
    const { connector, send } = makeConnector()
    const token = assetToken(ASSET_HUB, "not-a-number")
    // storage prefix + the holder's hashed account from a real key, around Blake2128Concat(u32 0)
    const storagePrefix = usdtHolderA.entry.key.slice(0, 2 + 64)
    const hashedAccount = usdtHolderA.entry.key.slice(2 + 64 + 32 + 8)
    const assetZeroKey = `${storagePrefix}${toHex(Blake2128Concat(u32.enc(0))).slice(2)}${hashedAccount}`

    const { success } = await fetchAssets([[token, [usdtHolderA.address]]], connector)

    expect(send.mock.calls).toEqual([[ASSET_HUB, "state_queryStorageAt", [[assetZeroKey]]]])
    expect(success).toEqual([assetBalance(token, usdtHolderA.address, { free: "0", frozen: "0" })])
  })

  it("falls back to a zero balance without querying for an unencodable address", async () => {
    const { connector, send } = makeConnector()

    const result = await fetchAssets([[USDT, ["not-an-address"]]], connector)

    expect(result).toEqual({
      success: [assetBalance(USDT, "not-an-address", { free: "0", frozen: "0" })],
      errors: [],
    })
    expect(send).not.toHaveBeenCalled()
  })

  describe("rejects an unusable miniMetadata with one error per address", () => {
    it.each([
      ["no data", { data: null }, "Minimetadata is required for fetching balances"],
      [
        "another module's source",
        { source: "substrate-foreignassets" },
        "Invalid request: miniMetadata source is not substrate-assets",
      ],
      ["another chain", { chainId: ASTAR }, `Invalid request: Expected chainId is ${ASSET_HUB}`],
    ] as const)("%s", async (_, override, message) => {
      const { connector, send } = makeConnector()

      const result = await fetchAssets(
        [[USDT, [usdtHolderA.address, usdtHolderB.address]]],
        connector,
        { miniMetadata: { ...ASSET_HUB_MINI_METADATA, ...override } }
      )

      expect(result).toEqual({
        success: [],
        errors: [
          { tokenId: USDT.id, address: usdtHolderA.address, error: new Error(message) },
          { tokenId: USDT.id, address: usdtHolderB.address, error: new Error(message) },
        ],
      })
      expect(send).not.toHaveBeenCalled()
    })
  })
})

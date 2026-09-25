import type { XcmVersionedAssets } from "@polkadot-api/descriptors"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { getMultiAssetTokenId } from "@ui/domains/Sign/Substrate/util/getMultiAssetTokenId"
import { describe, expect, it } from "vitest"

// Astar is the interesting shape: a parachain whose native token is not the relay's, so `parents`
// is the only thing distinguishing 100 ASTR from 100 DOT — and their decimals differ.
const ASTAR = {
  id: "astar",
  nativeTokenId: "astar:substrate-native",
  topology: { type: "parachain", relayId: "polkadot", paraId: 2006 },
} as unknown as DotNetwork

const POLKADOT = {
  id: "polkadot",
  nativeTokenId: "polkadot:substrate-native",
  topology: { type: "relay" },
} as unknown as DotNetwork

const VALUE = 1_000_000_000_000n

const assets = (parents: number, interior: unknown) =>
  ({
    type: "V3",
    value: [
      {
        id: { type: "Concrete", value: { parents, interior } },
        fun: { type: "Fungible", value: VALUE },
      },
    ],
  }) as unknown as XcmVersionedAssets

const HERE = { type: "Here", value: undefined }
const LOCAL_ASSET = {
  type: "X2",
  value: [
    { type: "PalletInstance", value: 50 },
    { type: "GeneralIndex", value: 1984n },
  ],
}

describe("getMultiAssetTokenId", () => {
  it("resolves a local native asset", () => {
    expect(getMultiAssetTokenId(assets(0, HERE), ASTAR)).toStrictEqual({
      tokenId: "astar:substrate-native",
      value: VALUE,
    })
  })

  it("resolves the relay native asset one hop up from a parachain", () => {
    expect(getMultiAssetTokenId(assets(1, HERE), ASTAR)).toStrictEqual({
      tokenId: "polkadot:substrate-native",
      value: VALUE,
    })
  })

  it("rejects a parent location on a relay chain, which has no parent", () => {
    expect(() => getMultiAssetTokenId(assets(1, HERE), POLKADOT)).toThrow("Unknown multi asset")
  })

  it("resolves a local assets-pallet token", () => {
    expect(getMultiAssetTokenId(assets(0, LOCAL_ASSET), ASTAR)).toStrictEqual({
      tokenId: "astar:substrate-assets:1984",
      value: VALUE,
    })
  })

  it("rejects an assets-pallet location that is not local", () => {
    expect(() => getMultiAssetTokenId(assets(1, LOCAL_ASSET), ASTAR)).toThrow("Unknown multi asset")
  })
})

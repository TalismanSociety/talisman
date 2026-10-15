import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { decAnyMetadata, unifyMetadata } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { deriveMiniMetadataId } from "../../types"
import { polkadotAssetHub as fixture } from "./__fixtures__/polkadotAssetHub"
import { getMiniMetadata } from "./getMiniMetadata"

const FIXTURES_DIR = path.resolve(
  import.meta.dirname,
  "../../../../../apps/extension/tests/fixtures"
)
const loadMetadataRpc = (name: string): `0x${string}` =>
  `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, name))).toString("hex")}`

const ASSET_HUB_METADATA = loadMetadataRpc("assethub-metadata-v15.scale.gz")
const ASSET_HUB_SPEC_VERSION = 2003001
const POLKADOT_METADATA = loadMetadataRpc("polkadot-metadata-v15.scale.gz")
const POLKADOT_SPEC_VERSION = 2003000

const storageItemsByPallet = (data: `0x${string}`) =>
  Object.fromEntries(
    unifyMetadata(decAnyMetadata(data)).pallets.map((pallet) => [
      pallet.name,
      pallet.storage?.items.map((item) => item.name).sort() ?? [],
    ])
  )

describe("substrate-native getMiniMetadata", () => {
  it("reads the Asset Hub constants the balance queries depend on", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "polkadot-asset-hub",
      specVersion: ASSET_HUB_SPEC_VERSION,
      metadataRpc: ASSET_HUB_METADATA,
    })

    expect(miniMetadata).toEqual({
      id: deriveMiniMetadataId({
        source: "substrate-native",
        chainId: "polkadot-asset-hub",
        specVersion: ASSET_HUB_SPEC_VERSION,
      }),
      source: "substrate-native",
      chainId: "polkadot-asset-hub",
      specVersion: ASSET_HUB_SPEC_VERSION,
      version: MINIMETADATA_VERSION,
      data: expect.stringMatching(/^0x6d657461/),
      extra: {
        useLegacyTransferableCalculation: false,
        existentialDeposit: fixture.constants.existentialDeposit,
        nominationPoolsPalletId: fixture.constants.nominationPoolsPalletId,
      },
    })
  })

  it("keeps only the storage items the balance queries read", () => {
    const { data } = getMiniMetadata({
      networkId: "polkadot-asset-hub",
      specVersion: ASSET_HUB_SPEC_VERSION,
      metadataRpc: ASSET_HUB_METADATA,
    })

    expect(storageItemsByPallet(data!)).toEqual({
      System: ["Account"],
      Balances: ["Freezes", "Holds", "Locks", "Reserves"],
      NominationPools: ["BondedPools", "Metadata", "PoolMembers"],
      Staking: ["Ledger"],
    })
  })

  it("reads the relay chain existential deposit of 1 DOT", () => {
    const { extra } = getMiniMetadata({
      networkId: "polkadot",
      specVersion: POLKADOT_SPEC_VERSION,
      metadataRpc: POLKADOT_METADATA,
    })

    expect(extra).toEqual({
      useLegacyTransferableCalculation: false,
      existentialDeposit: "10000000000",
      nominationPoolsPalletId: "py/nopls",
    })
  })

  it("returns no data when the module is disabled", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "polkadot",
      specVersion: POLKADOT_SPEC_VERSION,
      metadataRpc: POLKADOT_METADATA,
      config: { disable: true },
    })

    expect(miniMetadata.data).toBeNull()
    expect(miniMetadata.extra).toEqual({ disable: true })
  })

  it("throws when the metadata belongs to another runtime version", () => {
    expect(() =>
      getMiniMetadata({
        networkId: "polkadot",
        specVersion: POLKADOT_SPEC_VERSION + 1,
        metadataRpc: POLKADOT_METADATA,
      })
    ).toThrow(
      `specVersion mismatch: expected ${POLKADOT_SPEC_VERSION + 1}, metadata got ${POLKADOT_SPEC_VERSION}`
    )
  })
})

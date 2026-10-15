import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { decAnyMetadata, unifyMetadata } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { deriveMiniMetadataId } from "../../types"
import { getMiniMetadata } from "./getMiniMetadata"

const FIXTURES_DIR = path.resolve(
  import.meta.dirname,
  "../../../../../apps/extension/tests/fixtures"
)
const loadMetadataRpc = (name: string): `0x${string}` =>
  `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, name))).toString("hex")}`

describe("substrate-foreignassets getMiniMetadata", () => {
  it("keeps only the ForeignAssets storage items on Asset Hub", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "polkadot-asset-hub",
      specVersion: 2003001,
      metadataRpc: loadMetadataRpc("assethub-metadata-v15.scale.gz"),
    })

    expect(miniMetadata).toEqual({
      id: deriveMiniMetadataId({
        source: "substrate-foreignassets",
        chainId: "polkadot-asset-hub",
        specVersion: 2003001,
      }),
      source: "substrate-foreignassets",
      chainId: "polkadot-asset-hub",
      specVersion: 2003001,
      version: MINIMETADATA_VERSION,
      data: expect.stringMatching(/^0x6d657461/),
      extra: null,
    })
    const pallets = unifyMetadata(decAnyMetadata(miniMetadata.data!)).pallets
    expect(
      pallets.map(({ name, storage }) => [name, storage?.items.map((item) => item.name)])
    ).toEqual([["ForeignAssets", ["Asset", "Account", "Metadata"]]])
  })

  it("returns no data on a chain without the ForeignAssets pallet", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "polkadot",
      specVersion: 2003000,
      metadataRpc: loadMetadataRpc("polkadot-metadata-v15.scale.gz"),
    })

    expect(miniMetadata.data).toBeNull()
    expect(miniMetadata.source).toBe("substrate-foreignassets")
  })

  it("throws when the metadata belongs to another runtime version", () => {
    expect(() =>
      getMiniMetadata({
        networkId: "polkadot-asset-hub",
        specVersion: 1,
        metadataRpc: loadMetadataRpc("assethub-metadata-v15.scale.gz"),
      })
    ).toThrow("specVersion mismatch: expected 1, metadata got 2003001")
  })
})

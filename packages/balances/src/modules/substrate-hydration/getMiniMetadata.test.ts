import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { compactMetadata, encodeMetadata, parseMetadataRpc } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { deriveMiniMetadataId } from "../../types"
import { hydration } from "./__fixtures__/hydration"
import { getMiniMetadata } from "./getMiniMetadata"

const PALLET_ITEMS: Record<string, string[]> = { AssetRegistry: ["Assets"], Tokens: ["Accounts"] }

/** the captured metadata, compacted again down to System.Version + the given pallets and apis */
const withoutItems = (pallets: string[], apis: string[]) => {
  const { metadata } = parseMetadataRpc(hydration.trimmedMetadataRpc as `0x${string}`)
  compactMetadata(
    metadata,
    [
      { pallet: "System", constants: ["Version"], items: [] },
      ...pallets.map((pallet) => ({ pallet, items: PALLET_ITEMS[pallet] ?? [] })),
    ],
    apis.map((runtimeApi) => ({ runtimeApi, methods: ["accounts"] }))
  )
  return encodeMetadata(metadata)
}

// trimmedMetadataRpc = Hydration's full v15 metadata compacted to System.Version + what this module
// needs, miniMetadata = getMiniMetadata run on the untrimmed metadata at capture time
const HYDRATION_MINIMETADATA_ID = deriveMiniMetadataId({
  source: "substrate-hydration",
  chainId: "hydradx",
  specVersion: hydration.specVersion,
})

describe("substrate-hydration getMiniMetadata", () => {
  it("compacts the metadata down to AssetRegistry.Assets, Tokens.Accounts and CurrenciesApi.accounts", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "hydradx",
      specVersion: hydration.specVersion,
      metadataRpc: hydration.trimmedMetadataRpc as `0x${string}`,
    })

    expect(miniMetadata).toEqual({
      id: HYDRATION_MINIMETADATA_ID,
      source: "substrate-hydration",
      chainId: "hydradx",
      specVersion: hydration.specVersion,
      version: MINIMETADATA_VERSION,
      data: hydration.miniMetadata.data,
      extra: null,
    })
  })

  it.each([
    ["the CurrenciesApi runtime api", ["AssetRegistry", "Tokens"], []],
    ["AssetRegistry.Assets", ["Tokens"], ["CurrenciesApi"]],
    ["Tokens.Accounts", ["AssetRegistry"], ["CurrenciesApi"]],
  ])("has no data when the chain lacks %s", (_, pallets, apis) => {
    const metadataRpc = withoutItems(pallets, apis)

    const miniMetadata = getMiniMetadata({
      networkId: "hydradx",
      specVersion: hydration.specVersion,
      metadataRpc,
    })

    expect(miniMetadata.data).toBeNull()
    expect(miniMetadata.id).toBe(HYDRATION_MINIMETADATA_ID)
  })

  it("throws when the metadata is for another spec version", () => {
    expect(() =>
      getMiniMetadata({
        networkId: "hydradx",
        specVersion: hydration.specVersion + 1,
        metadataRpc: hydration.trimmedMetadataRpc as `0x${string}`,
      })
    ).toThrow(
      `specVersion mismatch: expected ${hydration.specVersion + 1}, metadata got ${hydration.specVersion}`
    )
  })
})

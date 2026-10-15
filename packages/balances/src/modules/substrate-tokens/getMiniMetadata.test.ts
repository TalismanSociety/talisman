import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { acala } from "./__fixtures__/acala"
import { hydration } from "./__fixtures__/hydration"
import { getMiniMetadata } from "./getMiniMetadata"

// trimmedMetadataRpc = the chain's full v15 metadata compacted to System.Version + Tokens.Accounts,
// miniMetadata = getMiniMetadata run on the untrimmed metadata at capture time
describe("substrate-tokens getMiniMetadata", () => {
  it.each([
    ["acala", acala],
    ["hydradx", hydration],
  ] as const)("compacts %s metadata down to Tokens.Accounts", (networkId, fixture) => {
    const miniMetadata = getMiniMetadata({
      networkId,
      specVersion: fixture.specVersion,
      metadataRpc: fixture.trimmedMetadataRpc as `0x${string}`,
    })

    expect(miniMetadata).toEqual({
      id: fixture.miniMetadata.id,
      source: "substrate-tokens",
      chainId: networkId,
      specVersion: fixture.specVersion,
      version: MINIMETADATA_VERSION,
      data: fixture.miniMetadata.data,
      extra: { palletId: "Tokens" },
    })
  })

  it("uses the pallet from the module config", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "acala",
      specVersion: acala.specVersion,
      metadataRpc: acala.trimmedMetadataRpc as `0x${string}`,
      config: { palletId: "OrmlTokens" },
    })

    // the chain has no OrmlTokens pallet: nothing to compact
    expect(miniMetadata.extra).toEqual({ palletId: "OrmlTokens" })
    expect(miniMetadata.data).toBeNull()
  })

  it("throws when the metadata is for another spec version", () => {
    expect(() =>
      getMiniMetadata({
        networkId: "acala",
        specVersion: acala.specVersion - 1,
        metadataRpc: acala.trimmedMetadataRpc as `0x${string}`,
      })
    ).toThrow(
      `specVersion mismatch: expected ${acala.specVersion - 1}, metadata got ${acala.specVersion}`
    )
  })
})

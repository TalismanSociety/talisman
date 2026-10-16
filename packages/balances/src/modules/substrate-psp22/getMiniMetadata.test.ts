import { MINIMETADATA_VERSION } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { deriveMiniMetadataId } from "../../types"
import { alephZero } from "./__fixtures__/alephZero"
import { getMiniMetadata } from "./getMiniMetadata"

// trimmedMetadataRpc = Aleph Zero's full v15 metadata compacted to System.Version
describe("substrate-psp22 getMiniMetadata", () => {
  it("carries no metadata: balances come from contract calls", () => {
    const miniMetadata = getMiniMetadata({
      networkId: "aleph-zero",
      specVersion: alephZero.specVersion,
      metadataRpc: alephZero.trimmedMetadataRpc as `0x${string}`,
    })

    expect(miniMetadata).toEqual({
      id: deriveMiniMetadataId({
        source: "substrate-psp22",
        chainId: "aleph-zero",
        specVersion: alephZero.specVersion,
      }),
      source: "substrate-psp22",
      chainId: "aleph-zero",
      specVersion: alephZero.specVersion,
      version: MINIMETADATA_VERSION,
      data: null,
      extra: null,
    })
  })

  it("throws when the metadata is for another spec version", () => {
    expect(() =>
      getMiniMetadata({
        networkId: "aleph-zero",
        specVersion: 1,
        metadataRpc: alephZero.trimmedMetadataRpc as `0x${string}`,
      })
    ).toThrow(`specVersion mismatch: expected 1, metadata got ${alephZero.specVersion}`)
  })
})

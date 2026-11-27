import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { parseMetadataRpc } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { fixtureHex } from "./__fixtures__"
import { fetchOwnedGammaDeposits } from "./chain"
import { getMiniMetadata } from "./getMiniMetadata"

const SINGLE = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const AT = "0x1111111111111111111111111111111111111111111111111111111111111111"

const keptItems = (metadataRpc: `0x${string}`) => {
  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)
  return {
    apis: unifiedMetadata.apis.map(({ name, methods }) => [name, methods.map((m) => m.name)]),
    storage: unifiedMetadata.pallets.map(({ name, storage }) => [
      name,
      storage?.items.map((item) => item.name),
    ]),
  }
}

describe("substrate-gamma getMiniMetadata", () => {
  it("keeps the gamma reads of spec 497 and decodes a recorded deposits response with them", async () => {
    const miniMetadata = getMiniMetadata({
      networkId: "bittensor",
      specVersion: 497,
      metadataRpc: fixtureHex("metadata-497.scale.gz"),
    })
    if (!miniMetadata.data) throw new Error("expected gamma mini-metadata for spec 497")

    expect(keptItems(miniMetadata.data)).toEqual({
      apis: [
        ["SubnetInfoRuntimeApi", ["get_all_dynamic_info"]],
        [
          "GammaRuntimeApi",
          [
            "get_gamma_deposit",
            "get_gamma_deposits_for_coldkey",
            "sim_mint_gamma",
            "sim_mint_gamma_with_stake",
          ],
        ],
      ],
      storage: [["SubtensorModule", ["GammaEnabled", "SubnetGammaEnabled", "GammaDeposits"]]],
    })
    expect(miniMetadata.data.length).toBeLessThan(10_000)

    const connector = {
      send: async () => fixtureHex(`497.${SINGLE}.bin.gz`),
    } as unknown as IChainConnectorDot
    const deposits = await fetchOwnedGammaDeposits({
      connector,
      networkId: "bittensor",
      metadataRpc: miniMetadata.data,
      coldkeys: [SINGLE],
      at: AT,
    })

    expect(deposits).toEqual(
      new Map([
        [
          SINGLE,
          [
            {
              netuid: 25,
              hotkey: "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns",
              balance: 154770370n,
              spendable: 154770370n,
              dailySpendCap: null,
            },
          ],
        ],
      ])
    )
  })

  it("has no data for Polkadot, which has no GammaRuntimeApi", () => {
    expect(
      getMiniMetadata({
        networkId: "polkadot",
        specVersion: 2003000,
        metadataRpc: fixtureHex("polkadot-metadata-v15.scale.gz"),
      })
    ).toMatchObject({ source: "substrate-gamma", chainId: "polkadot", data: null })
  })
})

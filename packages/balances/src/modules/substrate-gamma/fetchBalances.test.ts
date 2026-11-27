import { fromHex, toHex } from "@polkadot-api/utils"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { Bytes, Option } from "scale-ts"
import { describe, expect, it, vi } from "vitest"

import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { fixtureHex } from "./__fixtures__"
import { fetchBalances } from "./fetchBalances"
import { getMiniMetadata } from "./getMiniMetadata"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const AT = "0x2222222222222222222222222222222222222222222222222222222222222222"
const SINGLE = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const SINGLE_ARG = "0xa4fd293bba8ddda9354d902fd4ed9ff0371f2f39ffd175260db696f5619d5e1c"
const PAUSED = "5CLWmDjLwkDtLQ86y9aiwfzrUCrtnnSWS9oEXianj2jMDCAo"
const PAUSED_ARG = "0x0c0e94b8a9a1e85d782407c8ef9abd9d1837b82591597f4bd1acbb3d65e95d76"
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const ALICE_ARG = "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"

const RESPONSES: Record<string, string> = {
  [SINGLE_ARG]: fixtureHex(`497.${SINGLE}.bin.gz`),
  [PAUSED_ARG]: fixtureHex(`497.${PAUSED}.bin.gz`),
  [ALICE_ARG]: fixtureHex(`497.${SINGLE}.bin.gz`),
}

const miniMetadata = getMiniMetadata({
  networkId: "bittensor",
  specVersion: 497,
  metadataRpc: fixtureHex("metadata-497.scale.gz"),
})

const staleMiniMetadata = getMiniMetadata({
  networkId: "bittensor",
  specVersion: 488,
  metadataRpc: fixtureHex("metadata-488.scale.gz"),
})

const metadataAtVersion = (name: string) => toHex(Option(Bytes()).enc(fromHex(fixtureHex(name))))

const stubConnector = ({
  specVersion = 497,
  metadata = (): string => {
    throw new Error("metadata unavailable")
  },
} = {}) => {
  const sent: { method: string; params: unknown[] }[] = []
  const connector = {
    send: async (_networkId: string, method: string, params: unknown[]) => {
      sent.push({ method, params })
      if (method === "chain_getBlockHash") return AT
      if (method === "state_getRuntimeVersion") return { specVersion }
      if (method === "state_call" && params[0] === "Metadata_metadata_at_version") return metadata()
      if (method === "state_call") return RESPONSES[params[1] as string]
      throw new Error(`unexpected ${method}`)
    },
  } as unknown as IChainConnectorDot
  return { connector, sent }
}

const gammaToken = (networkId: string, netuid: number) =>
  ({
    id: `${networkId}:substrate-gamma:${netuid}`,
    type: "substrate-gamma",
    platform: "polkadot",
    networkId,
    netuid,
    symbol: `γSN${netuid}`,
    decimals: 9,
    isTransferable: false,
  }) as TokensWithAddresses[number][0]

const run = (
  connector: IChainConnectorDot,
  addresses: string[],
  { networkId = "bittensor", metadata = miniMetadata } = {}
) =>
  fetchBalances({
    networkId,
    tokensWithAddresses: [
      [gammaToken(networkId, 25), addresses],
      [gammaToken(networkId, 28), addresses],
    ],
    connector,
    miniMetadata: { ...metadata, chainId: networkId },
  })

const requestedTokenIds = (networkId: string) =>
  [25, 28].map((netuid) => `${networkId}:substrate-gamma:${netuid}`)

const sentCalls = (sent: { method: string; params: unknown[] }[]) =>
  sent.map(({ method, params }) => [method, ...params])

const errorMessages = (result: Awaited<ReturnType<typeof run>>) =>
  result.errors.map(({ tokenId, address, error }) => [tokenId, address, error.message])

const deposit = (hotkey: string, amount: string) => ({
  type: "reserved",
  label: `gamma-deposit:${hotkey}`,
  amount,
  meta: { type: "gamma-deposit", hotkey, spendable: amount, dailySpendCap: null },
})

describe("substrate-gamma fetchBalances", () => {
  it("emits one balance per address and subnet, and a token for a subnet nobody requested", async () => {
    const { connector, sent } = stubConnector()

    expect(await run(connector, [SINGLE, PAUSED])).toEqual({
      success: [
        {
          source: "substrate-gamma",
          status: "live",
          address: SINGLE,
          tokenId: "bittensor:substrate-gamma:25",
          networkId: "bittensor",
          values: [deposit("5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns", "154770370")],
        },
        {
          source: "substrate-gamma",
          status: "live",
          address: PAUSED,
          tokenId: "bittensor:substrate-gamma:28",
          networkId: "bittensor",
          values: [
            deposit("5Cw8VV3Hu78XGCCPm3kAjFPNadwnadgRQiAH5QeYNNnCbTGG", "9966901290"),
            deposit("5CqaQ34dznCVTdrpcxoiTKcSTbZ87x3oSjJh5G1rTERmcCWK", "250035491412"),
          ],
        },
      ],
      errors: [],
      dynamicTokens: [
        {
          id: "bittensor:substrate-gamma:53",
          type: "substrate-gamma",
          platform: "polkadot",
          networkId: "bittensor",
          netuid: 53,
          isDefault: true,
          symbol: "γSN53",
          decimals: 9,
          name: "SN53 credits",
          isTransferable: false,
        },
      ],
    })
    expect(sentCalls(sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "GammaRuntimeApi_get_gamma_deposits_for_coldkey", SINGLE_ARG, AT],
      ["state_call", "GammaRuntimeApi_get_gamma_deposits_for_coldkey", PAUSED_ARG, AT],
    ])
  })

  it("emits an error for each requested token of a coldkey whose read failed and keeps the others", async () => {
    const { connector } = stubConnector()
    const result = await run(connector, [SINGLE, ALICE])

    expect(result.success.map(({ address, tokenId }) => [address, tokenId])).toEqual([
      [SINGLE, "bittensor:substrate-gamma:25"],
    ])
    expect(errorMessages(result)).toEqual(
      ["bittensor:substrate-gamma:25", "bittensor:substrate-gamma:28"].map((tokenId) => [
        tokenId,
        ALICE,
        `unsupported GammaRuntimeApi.get_gamma_deposits_for_coldkey shape: deposit coldkey ${SINGLE} is not the queried coldkey ${ALICE}`,
      ])
    )
  })

  it("decodes with metadata it fetches once per spec when the pinned block runs a newer spec", async () => {
    const { connector, sent } = stubConnector({
      metadata: () => metadataAtVersion("metadata-497.scale.gz"),
    })
    const options = { networkId: "upgraded", metadata: staleMiniMetadata }

    const first = await run(connector, [SINGLE], options)
    const second = await run(connector, [SINGLE], options)

    for (const result of [first, second])
      expect(result.success.map(({ tokenId, values }) => [tokenId, values])).toEqual([
        [
          "upgraded:substrate-gamma:25",
          [deposit("5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns", "154770370")],
        ],
      ])
    expect(sentCalls(sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
      ["state_call", "GammaRuntimeApi_get_gamma_deposits_for_coldkey", SINGLE_ARG, AT],
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "GammaRuntimeApi_get_gamma_deposits_for_coldkey", SINGLE_ARG, AT],
    ])
  })

  it("decodes with fetched metadata when the stale spec had no gamma support and the chain now has it", async () => {
    const { connector, sent } = stubConnector({
      metadata: () => metadataAtVersion("metadata-497.scale.gz"),
    })

    const result = await run(connector, [SINGLE], {
      networkId: "gamma-enabled",
      metadata: { ...miniMetadata, specVersion: 400, data: null },
    })

    expect(result.success.map(({ tokenId, values }) => [tokenId, values])).toEqual([
      [
        "gamma-enabled:substrate-gamma:25",
        [deposit("5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns", "154770370")],
      ],
    ])
    expect(result.errors).toEqual([])
    expect(sentCalls(sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
      ["state_call", "GammaRuntimeApi_get_gamma_deposits_for_coldkey", SINGLE_ARG, AT],
    ])
  })

  it("emits errors without fetching metadata when the current spec has no gamma support", async () => {
    const { connector, sent } = stubConnector()

    const result = await run(connector, [SINGLE], {
      networkId: "no-gamma",
      metadata: { ...miniMetadata, data: null },
    })

    expect(result.success).toEqual([])
    expect(errorMessages(result)).toEqual(
      requestedTokenIds("no-gamma").map((tokenId) => [
        tokenId,
        SINGLE,
        "Spec 497 of no-gamma has no substrate-gamma support",
      ])
    )
    expect(sentCalls(sent)).toEqual([["chain_getBlockHash"], ["state_getRuntimeVersion", AT]])
  })

  it("emits errors and no balances on every call while the newer spec's metadata cannot be fetched", async () => {
    const { connector, sent } = stubConnector({ specVersion: 498 })

    for (const _ of [1, 2]) {
      const result = await run(connector, [SINGLE], { networkId: "unfetchable" })
      expect(result.success).toEqual([])
      expect(errorMessages(result)).toEqual(
        requestedTokenIds("unfetchable").map((tokenId) => [
          tokenId,
          SINGLE,
          "Failed to fetch substrate-gamma balances on unfetchable",
        ])
      )
    }
    expect(sentCalls(sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
    ])
  })

  it("emits errors and no balances when the newer spec has no gamma runtime api", async () => {
    const { connector, sent } = stubConnector({
      specVersion: 2003000,
      metadata: () => metadataAtVersion("polkadot-metadata-v15.scale.gz"),
    })

    for (const _ of [1, 2]) {
      const result = await run(connector, [SINGLE], { networkId: "gamma-removed" })
      expect(result.success).toEqual([])
      expect(errorMessages(result)).toEqual(
        requestedTokenIds("gamma-removed").map((tokenId) => [
          tokenId,
          SINGLE,
          "Spec 2003000 of gamma-removed has no substrate-gamma support",
        ])
      )
    }
    expect(sentCalls(sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
    ])
  })

  it("keeps the metadata it fetched for one network out of another network at the same spec", async () => {
    const fetched = stubConnector({ metadata: () => metadataAtVersion("metadata-497.scale.gz") })
    const unfetchable = stubConnector()

    await run(fetched.connector, [SINGLE], { networkId: "network-a", metadata: staleMiniMetadata })
    const result = await run(unfetchable.connector, [SINGLE], {
      networkId: "network-b",
      metadata: staleMiniMetadata,
    })

    expect(result.success).toEqual([])
    expect(errorMessages(result)).toEqual(
      requestedTokenIds("network-b").map((tokenId) => [
        tokenId,
        SINGLE,
        "Failed to fetch substrate-gamma balances on network-b",
      ])
    )
    expect(sentCalls(unfetchable.sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
    ])
  })

  it("fetches metadata again when a second upgrade lands in the same session", async () => {
    const options = { networkId: "upgraded-twice", metadata: staleMiniMetadata }
    const first = stubConnector({ metadata: () => metadataAtVersion("metadata-497.scale.gz") })
    const second = stubConnector({
      specVersion: 2003000,
      metadata: () => metadataAtVersion("polkadot-metadata-v15.scale.gz"),
    })

    await run(first.connector, [SINGLE], options)
    const result = await run(second.connector, [SINGLE], options)

    expect(result.success).toEqual([])
    expect(errorMessages(result)).toEqual(
      requestedTokenIds("upgraded-twice").map((tokenId) => [
        tokenId,
        SINGLE,
        "Spec 2003000 of upgraded-twice has no substrate-gamma support",
      ])
    )
    expect(sentCalls(second.sent)).toEqual([
      ["chain_getBlockHash"],
      ["state_getRuntimeVersion", AT],
      ["state_call", "Metadata_metadata_at_version", "0x0f000000", AT],
    ])
  })
})

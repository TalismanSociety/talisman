import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { subGammaTokenId } from "@talismn/chaindata-provider"
import { decAnyMetadata, encodeMetadata, parseMetadataRpc, toHex } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { fetchOwnedGammaDeposits, type GammaDeposit, GammaWireShapeError } from "./chain"
import { getGammaDeposits, toGammaBalance } from "./deposits"

const FIXTURES_DIR = path.join(import.meta.dirname, "__fixtures__")
const fixtureHex = (name: string) =>
  `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, name))).toString("hex")}` as const

const AT = "0x1111111111111111111111111111111111111111111111111111111111111111"
const SINGLE = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const SINGLE_ARG = "0xa4fd293bba8ddda9354d902fd4ed9ff0371f2f39ffd175260db696f5619d5e1c"
const SINGLE_HOTKEY = "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns"
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const ALICE_ARG = "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"

const SINGLE_DEPOSITS: GammaDeposit[] = [
  {
    netuid: 25,
    hotkey: SINGLE_HOTKEY,
    balance: 154770370n,
    spendable: 154770370n,
    dailySpendCap: null,
  },
]

const PAUSED = "5CLWmDjLwkDtLQ86y9aiwfzrUCrtnnSWS9oEXianj2jMDCAo"
const PAUSED_ARG = "0x0c0e94b8a9a1e85d782407c8ef9abd9d1837b82591597f4bd1acbb3d65e95d76"
const PAUSED_DEPOSITS: GammaDeposit[] = [
  {
    netuid: 28,
    hotkey: "5Cw8VV3Hu78XGCCPm3kAjFPNadwnadgRQiAH5QeYNNnCbTGG",
    balance: 9966901290n,
    spendable: 9966901290n,
    dailySpendCap: null,
  },
  {
    netuid: 28,
    hotkey: "5CqaQ34dznCVTdrpcxoiTKcSTbZ87x3oSjJh5G1rTERmcCWK",
    balance: 250035491412n,
    spendable: 250035491412n,
    dailySpendCap: null,
  },
  {
    netuid: 53,
    hotkey: "5Co2v4ET4pZ4ikB7s5CDDSxjhaGuTf2rUqRhrjt8H8WTTQ1A",
    balance: 61829126n,
    spendable: 61829126n,
    dailySpendCap: null,
  },
  {
    netuid: 53,
    hotkey: "5CqaQ34dznCVTdrpcxoiTKcSTbZ87x3oSjJh5G1rTERmcCWK",
    balance: 440713619892n,
    spendable: 0n,
    dailySpendCap: 0n,
  },
]

/** A capped deposit's spendable refills every block, so a re-record changes it and only it. */
const withoutSpendable = ({ spendable: _, ...deposit }: GammaDeposit) => deposit

const CAPPED = "5DbyUgRHKtebU6QwbyNpYHiUqLDAZ9xHo12A84U9ER228JDM"
const CAPPED_DEPOSITS: GammaDeposit[] = [
  { netuid: 51, hotkey: CAPPED, balance: 0n, spendable: 0n, dailySpendCap: null },
  {
    netuid: 53,
    hotkey: "5DoMfqSMFavvTswDuvqZ5aBHgLhNCRBkQEryb1i7dpyL2yc1",
    balance: 14241315679n,
    spendable: 2414583333n,
    dailySpendCap: 5000000000n,
  },
  {
    netuid: 75,
    hotkey: "5Ebb8UgZaW1EcEPb5pi6gR2QhqDrqgwcaCmkHrFcNDqBRLXq",
    balance: 1650177188n,
    spendable: 1650177188n,
    dailySpendCap: 5000000000n,
  },
  {
    netuid: 117,
    hotkey: "5CXTDHHSo4GpjFkmuQPEpwn3wvVQYWx5T3JuseKJYnKspZCz",
    balance: 9229746190n,
    spendable: 1992166663n,
    dailySpendCap: 10000000000n,
  },
]

const stubConnector = (respond: (coldkeyArg: string) => string) => {
  const sent: { networkId: string; method: string; params: unknown[] }[] = []
  const connector = {
    send: async (networkId: string, method: string, params: unknown[]) => {
      sent.push({ networkId, method, params })
      return respond(params[1] as string)
    },
  } as unknown as IChainConnectorDot
  return { connector, sent }
}

const fetchDeposits = (
  connector: IChainConnectorDot,
  metadataRpc: `0x${string}`,
  coldkeys: string[]
) => fetchOwnedGammaDeposits({ connector, networkId: "bittensor", metadataRpc, coldkeys, at: AT })

const read = async (metadataRpc: `0x${string}`, coldkey: string, response: string) =>
  (await fetchDeposits(stubConnector(() => response).connector, metadataRpc, [coldkey])).get(
    coldkey
  )

const METADATA_497 = fixtureHex("metadata-497.scale.gz")
const recorded = (coldkey: string) => fixtureHex(`497.${coldkey}.bin.gz`)

const encodeResponse = (metadataRpc: `0x${string}`, value: unknown) =>
  toHex(
    parseMetadataRpc(metadataRpc)
      .builder.buildRuntimeCall("GammaRuntimeApi", "get_gamma_deposits_for_coldkey")
      .value.enc(value)
  )

const metadataWithoutDepositField = (field: string) => {
  const metadata = decAnyMetadata(METADATA_497)
  if (metadata.metadata.tag !== "v15") throw new Error("expected v15 metadata")
  const depositType = metadata.metadata.value.lookup.find(
    (type) => type.path.join("::") === "pallet_subtensor::pallet::GammaDeposit"
  )
  if (depositType?.def.tag !== "composite") throw new Error("GammaDeposit not found")
  depositType.def.value = depositType.def.value.filter(({ name }) => name !== field)
  return encodeMetadata(metadata)
}

const statusesByNetuid = (coldkey: string, deposits: GammaDeposit[]) =>
  Object.fromEntries(
    [...new Set(deposits.map(({ netuid }) => netuid))].map((netuid) => {
      const balance = toGammaBalance(
        coldkey,
        subGammaTokenId("bittensor", netuid),
        deposits.filter((deposit) => deposit.netuid === netuid)
      )
      return [
        netuid,
        balance && getGammaDeposits(balance).map(({ hotkey, status }) => ({ hotkey, status })),
      ]
    })
  )

describe("fetchOwnedGammaDeposits", () => {
  it("runs the deposits call for the coldkey at the given block", async () => {
    const { connector, sent } = stubConnector(() => recorded(SINGLE))

    expect(await fetchDeposits(connector, METADATA_497, [SINGLE])).toEqual(
      new Map([[SINGLE, SINGLE_DEPOSITS]])
    )
    expect(sent).toEqual([
      {
        networkId: "bittensor",
        method: "state_call",
        params: ["GammaRuntimeApi_get_gamma_deposits_for_coldkey", SINGLE_ARG, AT],
      },
    ])
  })

  it("keeps the good coldkeys of a batch when one response is bad", async () => {
    const responses: Record<string, string> = {
      [SINGLE_ARG]: recorded(SINGLE),
      [PAUSED_ARG]: recorded(PAUSED),
      [ALICE_ARG]: recorded(SINGLE),
    }
    const { connector } = stubConnector((arg) => responses[arg])
    const result = await fetchDeposits(connector, METADATA_497, [SINGLE, PAUSED, ALICE])

    expect(result.get(SINGLE)).toEqual(SINGLE_DEPOSITS)
    expect(result.get(PAUSED)).toEqual(PAUSED_DEPOSITS)
    expect(result.get(ALICE)).toBeInstanceOf(GammaWireShapeError)
    expect(result.get(ALICE)).toHaveProperty(
      "message",
      `unsupported GammaRuntimeApi.get_gamma_deposits_for_coldkey shape: deposit coldkey ${SINGLE} is not the queried coldkey ${ALICE}`
    )
  })

  it("maps every coldkey to an error without a request on a chain without GammaRuntimeApi", async () => {
    const { connector, sent } = stubConnector(() => recorded(SINGLE))
    const result = await fetchDeposits(connector, fixtureHex("polkadot-metadata-v15.scale.gz"), [
      SINGLE,
      ALICE,
    ])

    expect(
      [...result].map(([coldkey, error]) => [coldkey, error instanceof Error && error.message])
    ).toEqual([
      [
        SINGLE,
        "Error fetching runtime call on bittensor for GammaRuntimeApi.get_gamma_deposits_for_coldkey",
      ],
      [
        ALICE,
        "Error fetching runtime call on bittensor for GammaRuntimeApi.get_gamma_deposits_for_coldkey",
      ],
    ])
    expect(sent).toEqual([])
  })

  it("ignores the extra spender field of the recorded spec 488 response", async () => {
    const coldkey = "5GeRaijjCS9pHHgHFid4MuAqMRtW1imS7arBuxeQRvgSgzyC"
    expect(
      await read(fixtureHex("metadata-488.scale.gz"), coldkey, fixtureHex(`488.${coldkey}.bin.gz`))
    ).toEqual([
      {
        netuid: 103,
        hotkey: "5GpE6BzryYDYxfnhjbQWWCj7Th1B9ak2ztoo5hBC9HEnwhUi",
        balance: 0n,
        spendable: 0n,
        dailySpendCap: null,
      },
    ])
  })

  it("decodes a deposit whose daily cap holds spendable below balance", async () => {
    expect(await read(METADATA_497, SINGLE, fixtureHex("capped.synthetic.bin.gz"))).toEqual([
      {
        netuid: 25,
        hotkey: SINGLE_HOTKEY,
        balance: 154770370n,
        spendable: 100000000n,
        dailySpendCap: 100000000n,
      },
    ])
  })

  it("rejects spendable above balance", async () => {
    const response = encodeResponse(METADATA_497, [
      {
        netuid: 25,
        hotkey: SINGLE_HOTKEY,
        deposit: { coldkey: SINGLE, balance: 1n, daily_spend_cap: undefined },
        spendable: 2n,
      },
    ])
    const result = await read(METADATA_497, SINGLE, response)

    expect(result).toBeInstanceOf(GammaWireShapeError)
    expect(result).toHaveProperty(
      "message",
      "unsupported GammaRuntimeApi.get_gamma_deposits_for_coldkey shape: spendable 2 exceeds balance 1"
    )
  })

  it("rejects a deposit without a balance field", async () => {
    const metadataRpc = metadataWithoutDepositField("balance")
    const response = encodeResponse(metadataRpc, [
      {
        netuid: 25,
        hotkey: SINGLE_HOTKEY,
        deposit: { coldkey: SINGLE, daily_spend_cap: undefined },
        spendable: 1n,
      },
    ])
    const result = await read(metadataRpc, SINGLE, response)

    expect(result).toBeInstanceOf(GammaWireShapeError)
    expect(result).toHaveProperty(
      "message",
      "unsupported GammaRuntimeApi.get_gamma_deposits_for_coldkey shape: ✖ Invalid input: expected bigint, received undefined\n  → at [0].deposit.balance"
    )
  })
})

describe("recorded spec 497 deposits", () => {
  it("shows a paused deposit beside open ones, including one on another owner's hotkey", async () => {
    const deposits = await read(METADATA_497, PAUSED, recorded(PAUSED))

    expect(deposits).toEqual(PAUSED_DEPOSITS)
    expect(statusesByNetuid(PAUSED, deposits)).toEqual({
      28: [
        { hotkey: "5Cw8VV3Hu78XGCCPm3kAjFPNadwnadgRQiAH5QeYNNnCbTGG", status: "open" },
        { hotkey: "5CqaQ34dznCVTdrpcxoiTKcSTbZ87x3oSjJh5G1rTERmcCWK", status: "open" },
      ],
      53: [
        { hotkey: "5Co2v4ET4pZ4ikB7s5CDDSxjhaGuTf2rUqRhrjt8H8WTTQ1A", status: "open" },
        { hotkey: "5CqaQ34dznCVTdrpcxoiTKcSTbZ87x3oSjJh5G1rTERmcCWK", status: "paused" },
      ],
    })
  })

  it("shows capped deposits and no balance for a subnet whose only deposit is empty", async () => {
    const deposits = await read(METADATA_497, CAPPED, recorded(CAPPED))

    expect(deposits.map(withoutSpendable)).toEqual(CAPPED_DEPOSITS.map(withoutSpendable))
    expect(statusesByNetuid(CAPPED, deposits)).toEqual({
      51: null,
      53: [{ hotkey: "5DoMfqSMFavvTswDuvqZ5aBHgLhNCRBkQEryb1i7dpyL2yc1", status: "capped" }],
      75: [{ hotkey: "5Ebb8UgZaW1EcEPb5pi6gR2QhqDrqgwcaCmkHrFcNDqBRLXq", status: "open" }],
      117: [{ hotkey: "5CXTDHHSo4GpjFkmuQPEpwn3wvVQYWx5T3JuseKJYnKspZCz", status: "capped" }],
    })
  })
})

import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { decAnyMetadata, encodeMetadata, parseMetadataRpc, toHex } from "@talismn/scale"
import { describe, expect, it } from "vitest"

import { fetchOwnedGammaDeposits, GammaWireShapeError } from "./chain"

const FIXTURES_DIR = path.join(import.meta.dirname, "__fixtures__")
const fixtureHex = (name: string) =>
  `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, name))).toString("hex")}` as const

const AT = "0x1111111111111111111111111111111111111111111111111111111111111111"
const SINGLE = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const SINGLE_HOTKEY = "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns"
const OLDER_SPEC_SINGLE = "5C5qSmgRntpCpCFwqDzqZyxXuneo6n3VBEK5JyonoKxr3pkD"
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const connectorReturning = (response: string) =>
  ({ send: async () => response }) as unknown as IChainConnectorDot

const read = async (metadataRpc: `0x${string}`, coldkey: string, response: string) =>
  (
    await fetchOwnedGammaDeposits({
      connector: connectorReturning(response),
      networkId: "bittensor",
      metadataRpc,
      coldkeys: [coldkey],
      at: AT,
    })
  ).get(coldkey)

const METADATA_497 = fixtureHex("metadata-497.scale.gz")

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

describe("fetchOwnedGammaDeposits", () => {
  it("decodes the recorded spec 497 response for a coldkey with one deposit", async () => {
    expect(await read(METADATA_497, SINGLE, fixtureHex(`497.${SINGLE}.bin.gz`))).toEqual([
      {
        netuid: 25,
        hotkey: SINGLE_HOTKEY,
        balance: 154770370n,
        spendable: 154770370n,
        dailySpendCap: null,
      },
    ])
  })

  it.each([493, 494])("decodes the recorded spec %i response", async (spec) => {
    expect(
      await read(
        fixtureHex(`metadata-${spec}.scale.gz`),
        OLDER_SPEC_SINGLE,
        fixtureHex(`${spec}.${OLDER_SPEC_SINGLE}.bin.gz`)
      )
    ).toEqual([
      {
        netuid: 80,
        hotkey: "5CiVZ2VFrM7N6dmkCbnhrq6jaCp75jxMADAqPo1hv5oizGnt",
        balance: 26804101427n,
        spendable: 26804101427n,
        dailySpendCap: 50000000000n,
      },
    ])
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

  it("rejects a deposit owned by another coldkey", async () => {
    const result = await read(METADATA_497, ALICE, fixtureHex(`497.${SINGLE}.bin.gz`))

    expect(result).toBeInstanceOf(GammaWireShapeError)
    expect(result).toHaveProperty(
      "message",
      `unsupported GammaRuntimeApi.get_gamma_deposits_for_coldkey shape: deposit coldkey ${SINGLE} is not the queried coldkey ${ALICE}`
    )
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

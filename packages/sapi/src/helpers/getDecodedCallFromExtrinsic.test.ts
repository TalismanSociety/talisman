import { compactNumber } from "@polkadot-api/substrate-bindings"
import { toHex } from "@polkadot-api/utils"
import { describe, expect, it, vi } from "vitest"

import { getTestScaleApi, PARITY_FIXTURES } from "../__fixtures__/chains"
import { getDecodedCallFromExtrinsic } from "./getDecodedCallFromExtrinsic"

const REMARK_TEXT = new TextEncoder().encode("talisman parity")
const REMARK_CALL = "00003c74616c69736d616e20706172697479"

const ALICE_PUBLIC_KEY = "d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"
const ALICE_POLKADOT_SS58 = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
const TRANSFER_KEEP_ALIVE_1_DOT = `050300${ALICE_PUBLIC_KEY}0700e40b5402`

const withLengthPrefix = (body: string) =>
  `${toHex(compactNumber.enc(body.length / 2))}${body}` as `0x${string}`

describe("getDecodedCallFromExtrinsic", () => {
  it.each(PARITY_FIXTURES.map((f) => [f.name, f] as const))(
    "decodes the polkadot-js signed extrinsic: %s",
    (_name, fixture) => {
      const { chain } = getTestScaleApi(fixture.chain)

      expect(getDecodedCallFromExtrinsic(chain, fixture.signedTransaction)).toEqual({
        pallet: "System",
        method: "remark",
        args: { remark: REMARK_TEXT },
      })
    }
  )

  it("decodes a bare extrinsic", () => {
    const { chain } = getTestScaleApi("polkadot")

    expect(
      getDecodedCallFromExtrinsic(chain, withLengthPrefix(`04${TRANSFER_KEEP_ALIVE_1_DOT}`))
    ).toEqual({
      pallet: "Balances",
      method: "transfer_keep_alive",
      args: { dest: { type: "Id", value: ALICE_POLKADOT_SS58 }, value: 10_000_000_000n },
    })
  })

  it("decodes a v5 general extrinsic", () => {
    const { chain } = getTestScaleApi("polkadot")
    const extensionVersion = "00"
    const extra = "00140000"

    expect(
      getDecodedCallFromExtrinsic(
        chain,
        withLengthPrefix(`45${extensionVersion}${extra}${REMARK_CALL}`)
      )
    ).toEqual({ pallet: "System", method: "remark", args: { remark: REMARK_TEXT } })
  })

  it("returns null and logs when the extrinsic cannot be decoded", () => {
    const { chain } = getTestScaleApi("polkadot")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(getDecodedCallFromExtrinsic(chain, withLengthPrefix("04ffff"))).toBeNull()
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0]?.[0]).toBe("[SAPI] Failed to decode extrinsic:")

    consoleError.mockRestore()
  })
})

import { describe, expect, it } from "vitest"

import { createRpcStub, getTestScaleApi } from "../__fixtures__/chains"
import type { DecodedCall } from "../types"
import { getDryRunCall } from "./getDryRunCall"
import type { Chain } from "./types"

const ALICE_POLKADOT_SS58 = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
const ALICE_PUBLIC_KEY = "d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"

const REMARK: DecodedCall<unknown> = {
  pallet: "System",
  method: "remark",
  args: { remark: new TextEncoder().encode("talisman parity") },
}
const REMARK_CALL = "00003c74616c69736d616e20706172697479"

const OK = "00"
const ERR = "01"
const NO_ACTUAL_WEIGHT = "00"
const PAYS_FEE = "00"
const NO_EVENTS_NO_XCM = "000000"
// DispatchError::Module (3), Balances (5), InsufficientBalance (2) padded to 4 bytes
const INSUFFICIENT_BALANCE = "030502000000"

const EXECUTED = `0x${OK}${OK}${NO_ACTUAL_WEIGHT}${PAYS_FEE}${NO_EVENTS_NO_XCM}`
const FAILED = `0x${OK}${ERR}${NO_ACTUAL_WEIGHT}${PAYS_FEE}${INSUFFICIENT_BALANCE}${NO_EVENTS_NO_XCM}`
const UNIMPLEMENTED = `0x${ERR}00`

const dryRunWith = async (respond: () => unknown) => {
  const rpc = createRpcStub(respond)
  const { chain } = getTestScaleApi("polkadot", { send: rpc.send })
  const result = await getDryRunCall(chain, ALICE_POLKADOT_SS58, REMARK)
  return { result, calls: rpc.calls }
}

describe("getDryRunCall", () => {
  it("dry runs the call signed by the sender", async () => {
    const { calls } = await dryRunWith(() => EXECUTED)

    const originSystemSigned = `0001${ALICE_PUBLIC_KEY}`
    const unsetResultXcmsVersion = "00000000"
    expect(calls).toEqual([
      {
        method: "state_call",
        params: [
          "DryRunApi_dry_run_call",
          `0x${originSystemSigned}${REMARK_CALL}${unsetResultXcmsVersion}`,
        ],
        isCacheable: undefined,
      },
    ])
  })

  it("reports a successful execution", async () => {
    const { result } = await dryRunWith(() => EXECUTED)

    expect(result).toMatchObject({ available: true, ok: true, errorMessage: null })
    expect(result.data).toMatchObject({
      success: true,
      value: { execution_result: { success: true } },
    })
  })

  it("reports a failed execution with its dispatch error", async () => {
    const { result } = await dryRunWith(() => FAILED)

    expect(result).toMatchObject({
      available: true,
      ok: false,
      errorMessage: "Balances: InsufficientBalance",
    })
    expect(result.data).toMatchObject({
      value: {
        execution_result: {
          success: false,
          value: {
            error: {
              type: "Module",
              value: { type: "Balances", value: { type: "InsufficientBalance" } },
            },
          },
        },
      },
    })
  })

  it("reports an api error as not ok without an error message", async () => {
    const { result } = await dryRunWith(() => UNIMPLEMENTED)

    expect(result).toEqual({
      available: true,
      ok: false,
      errorMessage: null,
      data: { success: false, value: { type: "Unimplemented", value: undefined } },
    })
  })

  it("is unavailable when the runtime call fails", async () => {
    const { result } = await dryRunWith(() => {
      throw new Error("Runtime call failed")
    })

    expect(result).toEqual({ available: false, data: null })
  })

  it("is unavailable without calling the chain when the runtime lacks DryRunApi", async () => {
    const rpc = createRpcStub(() => "0x")
    const { chain } = getTestScaleApi("polkadot", { send: rpc.send })
    const withoutDryRun: Chain = { ...chain, metadata: { ...chain.metadata, apis: [] } }

    expect(await getDryRunCall(withoutDryRun, ALICE_POLKADOT_SS58, REMARK)).toEqual({
      available: false,
      data: null,
    })
    expect(rpc.calls).toEqual([])
  })
})

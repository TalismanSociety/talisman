import { describe, expect, it } from "vitest"

import { createRpcStub, getParityFixture, getTestScaleApi } from "../__fixtures__/chains"

// RuntimeDispatchInfo: weight { ref_time: compact 1000, proof_size: compact 0 }, class: Normal, partial_fee: u128
const dispatchInfo = (partialFeeLe: string) => `0xa10f0000${partialFeeLe.padEnd(32, "0")}`
const FEE_123456789 = dispatchInfo("15cd5b07")

const zeroSignature = (signedTransaction: string, signatureOffset: number, length: number) => {
  const start = 2 + signatureOffset * 2
  return `${signedTransaction.slice(0, start)}${"00".repeat(length)}${signedTransaction.slice(start + length * 2)}`
}

// length prefix (2) + version (1) + MultiAddress::Id (1 + 32) + MultiSignature::Ecdsa type (1)
const polkadotEcdsa = getParityFixture("polkadot ecdsa immortal")
const POLKADOT_FAKE_SIGNED = zeroSignature(polkadotEcdsa.signedTransaction, 37, 65)

// length prefix (2) + version (1) + AccountId20 (20)
const moonbeam = getParityFixture("moonbeam ethereum immortal")
const MOONBEAM_FAKE_SIGNED = zeroSignature(moonbeam.signedTransaction, 23, 65)

describe("getFeeEstimate", () => {
  it("queries TransactionPaymentApi with an ecdsa-sized fake signature and the unprefixed length", async () => {
    const rpc = createRpcStub(() => FEE_123456789)
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    expect(await api.getFeeEstimate(polkadotEcdsa.payload)).toBe(123_456_789n)
    expect(rpc.calls).toEqual([
      {
        method: "state_call",
        params: ["TransactionPaymentApi_query_info", `${POLKADOT_FAKE_SIGNED}7a000000`],
        isCacheable: undefined,
      },
    ])
  })

  it("replaces ed25519 and sr25519 signatures with the longer ecdsa one", async () => {
    const rpc = createRpcStub(() => FEE_123456789)
    const api = getTestScaleApi("polkadot", { send: rpc.send })
    const ed25519 = getParityFixture("polkadot ed25519 immortal")
    const { signedTransaction } = ed25519
    // length prefix (2) + version (1) + MultiAddress::Id (1 + 32), then MultiSignature::Ed25519 (1 + 64)
    const fakeSigned = `0xe901${signedTransaction.slice(6, 74)}02${"00".repeat(65)}${signedTransaction.slice(204)}`

    await api.getFeeEstimate(ed25519.payload)

    expect(rpc.calls[0]?.params).toEqual([
      "TransactionPaymentApi_query_info",
      `${fakeSigned}7a000000`,
    ])
  })

  it("uses a raw 65-byte signature for ethereum accounts", async () => {
    const rpc = createRpcStub(() => FEE_123456789)
    const api = getTestScaleApi("moonbeam", { send: rpc.send })

    expect(await api.getFeeEstimate(moonbeam.payload)).toBe(123_456_789n)
    expect(rpc.calls[0]?.params).toEqual([
      "TransactionPaymentApi_query_info",
      `${MOONBEAM_FAKE_SIGNED}6c000000`,
    ])
  })

  it("returns a zero fee without falling back", async () => {
    const rpc = createRpcStub(() => dispatchInfo(""))
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    expect(await api.getFeeEstimate(polkadotEcdsa.payload)).toBe(0n)
    expect(rpc.calls).toHaveLength(1)
  })

  it("falls back to the length-prefixed extrinsic when the runtime call fails", async () => {
    const rpc = createRpcStub(() => {
      if (rpc.calls.length === 1) throw new Error("Runtime call failed")
      return FEE_123456789
    })
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    expect(await api.getFeeEstimate(polkadotEcdsa.payload)).toBe(123_456_789n)
    expect(rpc.calls[1]).toEqual({
      method: "state_call",
      params: ["TransactionPaymentApi_query_info", `${POLKADOT_FAKE_SIGNED}7c000000`],
      isCacheable: true,
    })
  })

  it("rejects when both estimates fail", async () => {
    const rpc = createRpcStub(() => {
      throw new Error("Node unavailable")
    })
    const api = getTestScaleApi("polkadot", { send: rpc.send })

    await expect(api.getFeeEstimate(polkadotEcdsa.payload)).rejects.toThrow("Node unavailable")
    expect(rpc.calls).toHaveLength(2)
  })
})

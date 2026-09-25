import type { SignerPayloadJSON, SignerPayloadRaw } from "@core/types/pjsInterop"
import { getPayloadTip } from "@ui/domains/Sign/Substrate/util/getPayloadTip"
import { describe, expect, it } from "vitest"

const jsonPayload = (tip: unknown) =>
  ({
    genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    tip,
  }) as unknown as SignerPayloadJSON

describe("getPayloadTip", () => {
  it("reads a hex tip", () => {
    expect(getPayloadTip(jsonPayload("0x0de0b6b3a7640000"))).toBe(1_000_000_000_000_000_000n)
  })

  it("reads a decimal tip", () => {
    expect(getPayloadTip(jsonPayload("42"))).toBe(42n)
  })

  it.each([undefined, null, "0x00", "0", ""])("treats %s as no tip", (tip) => {
    expect(getPayloadTip(jsonPayload(tip))).toBe(0n)
  })

  // a dapp controls this field, so anything it sends must degrade to 0 rather than throw on the
  // sign screen — and must never come out negative, which would understate the total
  it.each(["not a number", "0xzz", "-1", {}, []])("degrades %s to no tip", (tip) => {
    expect(getPayloadTip(jsonPayload(tip))).toBe(0n)
  })

  it("ignores raw (non-extrinsic) payloads", () => {
    const raw = { data: "0xdeadbeef", type: "bytes" } as SignerPayloadRaw
    expect(getPayloadTip(raw)).toBe(0n)
  })

  it("handles a missing payload", () => {
    expect(getPayloadTip(null)).toBe(0n)
  })
})

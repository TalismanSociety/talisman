import { toHex } from "@polkadot-api/utils"
import { describe, expect, it } from "vitest"

import { getParityFixture, getTestScaleApi } from "./__fixtures__/chains"
import { CUSTOM_SIGNED_EXTENSIONS } from "./customSignedExtensions"

const { payload } = getParityFixture("polkadot ed25519 immortal")
const unifiedMeta = getTestScaleApi("polkadot").chain.metadata

const encodeCheckAppId = (appId?: unknown) => {
  const { value, additionalSigned } = CUSTOM_SIGNED_EXTENSIONS.CheckAppId({
    pjsPayload: { ...payload, appId } as typeof payload,
    unifiedMeta,
  })
  return { value: toHex(value), additionalSigned: toHex(additionalSigned) }
}

describe("CheckAppId", () => {
  it("encodes the app id as a compact", () => {
    expect(encodeCheckAppId(5)).toEqual({ value: "0x14", additionalSigned: "0x" })
    expect(encodeCheckAppId(1000)).toEqual({ value: "0xa10f", additionalSigned: "0x" })
  })

  it("defaults to app id 0", () => {
    expect(encodeCheckAppId(undefined)).toEqual({ value: "0x00", additionalSigned: "0x" })
    expect(encodeCheckAppId("not a number")).toEqual({ value: "0x00", additionalSigned: "0x" })
  })

  it("accepts numeric strings", () => {
    expect(encodeCheckAppId("5")).toEqual({ value: "0x14", additionalSigned: "0x" })
  })
})

import { describe, expect, it, vi } from "vitest"
import { getMetadata, getParityFixture, getTestScaleApi, TOKENS } from "./__fixtures__/chains"
import { getScaleApi } from "./sapi"

const REMARK_METHOD = "0x00003c74616c69736d616e20706172697479"
const REMARK_TEXT = new TextEncoder().encode("talisman parity")

describe("getScaleApi", () => {
  it("identifies the api by chain, spec name and spec version", () => {
    const api = getTestScaleApi("assethub", { hasCheckMetadataHash: true })

    expect(api).toMatchObject({
      id: "assethub::statemint::2003001",
      chainId: "assethub",
      specName: "statemint",
      specVersion: 2003001,
      base58Prefix: 0,
      hasCheckMetadataHash: true,
      token: TOKENS.assethub,
    })
  })

  it.each([
    ["polkadot", 10_000_000_000n],
    ["assethub", 100_000_000n],
    ["moonbeam", 0n],
  ] as const)("reads the existential deposit of %s", (chain, existentialDeposit) => {
    expect(getTestScaleApi(chain).getConstant("Balances", "ExistentialDeposit")).toBe(
      existentialDeposit
    )
  })

  it("checks constants", () => {
    const api = getTestScaleApi("polkadot")

    expect(api.hasConstant("Balances", "ExistentialDeposit")).toBe(true)
    expect(api.hasConstant("Balances", "NotAConstant")).toBe(false)
    expect(api.hasConstant("NotAPallet", "ExistentialDeposit")).toBe(false)
  })

  it("checks runtime apis", () => {
    const api = getTestScaleApi("polkadot")

    expect(api.isApiAvailable("DryRunApi", "dry_run_call")).toBe(true)
    expect(api.isApiAvailable("DryRunApi", "not_a_method")).toBe(false)
    expect(api.isApiAvailable("NotAnApi", "dry_run_call")).toBe(false)
  })

  // hasEvent checks `typeof pallet.events === "number"`, but unified metadata holds `{ type }`
  it.fails("finds events the metadata declares", () => {
    const api = getTestScaleApi("polkadot")

    expect(api.hasEvent("Balances", "Transfer")).toBe(true)
    expect(api.hasEvent("System", "ExtrinsicSuccess")).toBe(true)
  })

  it("finds no event in an unknown pallet", () => {
    expect(getTestScaleApi("polkadot").hasEvent("NotAPallet", "Transfer")).toBe(false)
  })

  it("shapes a call for papi", () => {
    expect(
      getTestScaleApi("polkadot").getDecodedCall("System", "remark", { remark: "0x" })
    ).toEqual({ type: "System", value: { type: "remark", value: { remark: "0x" } } })
  })

  it("decodes the call of a payload", () => {
    const api = getTestScaleApi("polkadot")

    expect(api.getDecodedCallFromPayload({ method: REMARK_METHOD })).toEqual({
      pallet: "System",
      method: "remark",
      args: { remark: REMARK_TEXT },
    })
  })

  describe("submit", () => {
    const { payload } = getParityFixture("polkadot ed25519 immortal")
    const signature = "0x01"

    const getApi = () => {
      const submit = vi.fn(async () => ({ hash: "0xaa" as const }))
      const submitWithBittensorMevShield = vi.fn(async () => ({
        hash: "0xbb" as const,
        innerHash: "0xcc" as const,
      }))
      const api = getScaleApi(
        { chainId: "polkadot", send: vi.fn(), submit, submitWithBittensorMevShield },
        getMetadata("polkadot"),
        TOKENS.polkadot
      )
      return { api, submit, submitWithBittensorMevShield }
    }

    it("submits signed payloads through the connector", async () => {
      const { api, submit, submitWithBittensorMevShield } = getApi()

      expect(await api.submit(payload, signature, { id: 1 })).toEqual({ hash: "0xaa" })
      expect(submit).toHaveBeenCalledWith(payload, signature, { id: 1 })
      expect(submitWithBittensorMevShield).not.toHaveBeenCalled()
    })

    it("submits unsigned payloads through the Bittensor MEV shield", async () => {
      const { api, submit, submitWithBittensorMevShield } = getApi()

      expect(await api.submit(payload, undefined, { id: 1 }, "bittensor-mev-shield")).toEqual({
        hash: "0xbb",
        innerHash: "0xcc",
      })
      expect(submitWithBittensorMevShield).toHaveBeenCalledWith(payload, { id: 1 })
      expect(submit).not.toHaveBeenCalled()
    })

    it("refuses a signature in Bittensor MEV shield mode", async () => {
      const { api, submitWithBittensorMevShield } = getApi()

      await expect(
        api.submit(payload, signature, undefined, "bittensor-mev-shield")
      ).rejects.toThrow("Signature should not be provided when using bittensor-mev-shield mode")
      expect(submitWithBittensorMevShield).not.toHaveBeenCalled()
    })

    it("throws when the connector has no submit handler", async () => {
      const api = getTestScaleApi("polkadot")

      await expect(api.submit(payload, signature)).rejects.toThrow("submit handler not provided")
      await expect(
        api.submit(payload, undefined, undefined, "bittensor-mev-shield")
      ).rejects.toThrow("submitWithBittensorMevShield handler not provided")
    })
  })
})

import { Ok } from "ts-results"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ExtensionStore } from "../../handlers/stores"
import type { Port } from "../../types/base"
import type { SignerPayloadJSON } from "../../types/pjsInterop"

const keystore = vi.hoisted(() => ({
  sign: vi.fn(),
  send: vi.fn(),
  watch: vi.fn(),
}))

const shield = vi.hoisted(() => ({
  getBestHead: vi.fn(),
  waitForNextHead: vi.fn(),
  sealAt: vi.fn(),
  broadcastMevShield: vi.fn(),
  broadcastMevShieldInWindow: vi.fn(),
}))

vi.mock("../../rpcs/chaindata", () => ({
  chaindataProvider: {
    getNetworkByGenesisHash: async (genesisHash: string) => ({ id: "bittensor", genesisHash }),
  },
}))
vi.mock("./mevShield", () => ({
  ...shield,
  createMevShieldSeal: async () => ({ sealAt: shield.sealAt, blockTimeMs: 12_000 }),
}))
vi.mock("../keyring/withSecretKey", () => ({
  withSecretKey: async (_address: string, run: (secretKey: Uint8Array) => Promise<unknown>) =>
    Ok(await run(new Uint8Array())),
}))
vi.mock("../signing/signSubstratePayload", () => ({
  signSubstratePayload: async (signed: SignerPayloadJSON) => ({
    signature: keystore.sign(signed),
  }),
  assembleSubstrateTransaction: async () => ({ signedTransaction: "0xtx", hash: "0xplain" }),
}))
vi.mock("../transactions/watchSubstrateTransaction", () => ({
  watchSubstrateTransaction: keystore.watch,
}))
vi.mock("../../rpcs/chain-connector-dot", () => ({ chainConnectorDot: { send: keystore.send } }))

import { SubHandler } from "./handler.extension"

const payload: SignerPayloadJSON = {
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  blockHash: "0x1234",
  blockNumber: "0x000003e8",
  era: "0x5500",
  genesisHash: "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03",
  method: "0x0700",
  nonce: "0x0000000f",
  specVersion: "0x000001df",
  tip: "0x00000000000000000000000000000000",
  transactionVersion: "0x00000001",
  signedExtensions: ["CheckNonce", "CheckMetadataHash"],
  version: 4,
}
const innerPayload: SignerPayloadJSON = { ...payload, nonce: "0x10" }
const outerPayload: SignerPayloadJSON = { ...payload, method: "0x1e01" }
const chain = { id: "bittensor", genesisHash: payload.genesisHash }
const head = { number: 1010, hash: "0xhead", parentHash: "0xparent", seenAt: 5_000 }
const shieldWindow = { headNumber: 1010, deadline: 26_000 }

const handler = new SubHandler({} as ExtensionStore)
const port = {} as Port

const prepare = () =>
  handler.handle("1", "pri(substrate.mevShield.prepare)", { payload, innerSignature: "0x01" }, port)

const submit = () =>
  handler.handle(
    "1",
    "pri(substrate.mevShield.submit)",
    { payload, innerSignature: "0x01", outerPayload, outerSignature: "0x02", shieldWindow },
    port
  )

describe("pri(substrate.mevShield.prepare)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    shield.waitForNextHead.mockResolvedValue(head)
    shield.sealAt.mockResolvedValue(outerPayload)
  })

  it("opens the window when the head is seen, until 3 seconds before block N + 2 is due", async () => {
    expect(await prepare()).toEqual({ status: "ready", outerPayload, shieldWindow })
    expect(shield.sealAt).toHaveBeenCalledWith(head)
  })

  it("reports a shield without key", async () => {
    shield.sealAt.mockResolvedValue(null)

    expect(await prepare()).toEqual({ status: "unavailable" })
  })

  it("refuses an inner transaction whose era ends before it can be included", async () => {
    shield.waitForNextHead.mockResolvedValue({ ...head, number: 1000 + 61 })

    expect(await prepare()).toEqual({ status: "expired" })
    expect(shield.sealAt).not.toHaveBeenCalled()
  })
})

describe("pri(substrate.mevShield.submit)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    shield.broadcastMevShieldInWindow.mockResolvedValue({
      status: "submitted",
      hash: "0xouter",
      innerHash: "0xinner",
    })
  })

  it("broadcasts the inner transaction at the next nonce, within the window", async () => {
    expect(await submit()).toEqual({ status: "submitted", hash: "0xouter", innerHash: "0xinner" })
    expect(shield.broadcastMevShieldInWindow).toHaveBeenCalledWith(
      chain,
      {
        inner: { payload: innerPayload, signature: "0x01" },
        outer: { payload: outerPayload, signature: "0x02" },
        txInfo: undefined,
      },
      shieldWindow
    )
  })

  it("answers missed when the window closed", async () => {
    shield.broadcastMevShieldInWindow.mockResolvedValue({ status: "missed" })

    expect(await submit()).toEqual({ status: "missed" })
  })
})

describe("pri(substrate.rpc.submit.withBittensorMevShield)", () => {
  const bestHead = { number: 1010, hash: "0xbest", parentHash: "0xparent" }
  const submitWithKeystore = () =>
    handler.handle("1", "pri(substrate.rpc.submit.withBittensorMevShield)", { payload }, port)

  beforeEach(() => {
    vi.clearAllMocks()
    keystore.sign.mockImplementation((signed: SignerPayloadJSON) =>
      signed === outerPayload ? "0xouter-sig" : "0xinner-sig"
    )
    shield.getBestHead.mockResolvedValue(bestHead)
    shield.broadcastMevShield.mockResolvedValue({ hash: "0xouter", innerHash: "0xinner" })
  })

  it("seals the inner transaction for the current best head, without waiting for a block", async () => {
    shield.sealAt.mockResolvedValue(outerPayload)

    expect(await submitWithKeystore()).toEqual({ hash: "0xouter", innerHash: "0xinner" })
    expect(keystore.sign).toHaveBeenNthCalledWith(1, innerPayload)
    expect(shield.sealAt).toHaveBeenCalledWith(bestHead)
    expect(shield.waitForNextHead).not.toHaveBeenCalled()
    expect(shield.broadcastMevShield).toHaveBeenCalledWith(chain, {
      inner: { payload: innerPayload, signature: "0xinner-sig" },
      outer: { payload: outerPayload, signature: "0xouter-sig" },
      txInfo: undefined,
    })
  })

  it("submits unshielded when the network has no key", async () => {
    shield.sealAt.mockResolvedValue(null)

    expect(await submitWithKeystore()).toEqual({ hash: "0xplain" })
    expect(keystore.send).toHaveBeenCalledWith("bittensor", "author_submitExtrinsic", ["0xtx"])
    expect(shield.broadcastMevShield).not.toHaveBeenCalled()
  })
})

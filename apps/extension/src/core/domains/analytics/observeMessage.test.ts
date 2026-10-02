import { catalogue, type EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import type { AccountKeypair } from "@talismn/keyring"
import type { Subscription } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { requestStore } from "../../libs/requests/store"
import type { ValidRequests } from "../../libs/requests/types"
import type { RequestTypes } from "../../types"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import { dappRequestTracker } from "./dappRequests"
import { observeExtensionMessage } from "./observeMessage"
import type { TxAttempt, TxContext } from "./txContext"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => {
  const calls: TrackedCall[] = []
  return { calls }
})

vi.mock("./track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const owned = vi.hoisted(() => ({
  eth: "0x1111111111111111111111111111111111111111" as const,
  polkadot: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
}))

vi.mock("./txContext", () => ({
  resolveTxContext: vi.fn(
    async ({
      platform,
      network,
      address,
      txType,
      submittedBy,
    }: TxAttempt): Promise<TxContext | null> =>
      address === owned.eth || address === owned.polkadot
        ? {
            platform,
            network_id: "networkId" in network ? network.networkId : "polkadot",
            tx_type: txType,
            submitted_by: submittedBy,
            signer: "local",
          }
        : null
  ),
}))

const popup = vi.hoisted(() => ({ close: () => {} }))

vi.mock("../../libs/WindowManager", () => ({
  windowManager: {
    popupOpen: vi.fn(async (_route: string, onClose: () => void) => {
      popup.close = onClose
      return 1
    }),
    popupClose: vi.fn(async () => {}),
  },
}))

const DAPP_URL = "https://app.example.com"

const ETH_ACCOUNT: AccountKeypair = {
  type: "keypair",
  curve: "ethereum",
  address: owned.eth,
  name: "Ethereum",
  createdAt: 0,
}

const POLKADOT_ACCOUNT: AccountKeypair = {
  type: "keypair",
  curve: "sr25519",
  address: owned.polkadot,
  name: "Polkadot",
  createdAt: 0,
}

const JSON_PAYLOAD: SignerPayloadJSON = {
  address: owned.polkadot,
  blockHash: "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80",
  blockNumber: "0x00000393",
  era: "0x3601",
  genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  method: "0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100",
  nonce: "0x0000000000000000",
  signedExtensions: ["CheckSpecVersion", "CheckGenesis", "CheckNonce"],
  specVersion: "0x00000026",
  tip: "0x00000000000000000000000000000000",
  transactionVersion: "0x00000005",
  version: 4,
}

const WALLET_SEND: RequestTypes["pri(eth.signing.signAndSend)"] = {
  evmNetworkId: "1",
  unsigned: { from: owned.eth, to: "0x2222222222222222222222222222222222222222", nonce: 3 },
}

const openRequest = <T extends Omit<ValidRequests, "id">>(
  options: T,
  port?: chrome.runtime.Port
) => {
  requestStore.createRequest(options, port).catch(() => {})
  const created = requestStore.getAllRequests().at(-1)
  if (!created) throw new Error("the request store kept no request")
  return created.id
}

const openEthSend = (ethChainId = "1") =>
  openRequest({
    type: "eth-send",
    url: DAPP_URL,
    ethChainId,
    account: ETH_ACCOUNT,
    request: { from: owned.eth, to: "0x2222222222222222222222222222222222222222" },
    method: "eth_sendTransaction",
  })

const openSubstrateSign = (
  payload: SignerPayloadJSON | { address: string; data: string; type: "bytes" }
) =>
  openRequest({
    type: "substrate-sign",
    url: DAPP_URL,
    request: { payload },
    account: POLKADOT_ACCOUNT,
  })

const trackedCalls = () => tracked.calls
const trackedEvents = () => trackedCalls().map(([event]) => event)
const txEvents = () => trackedEvents().filter((event) => event.startsWith("tx_"))
const propsOf = (name: string) => trackedCalls().find(([event]) => event === name)?.[1]

const expectTrackedPropsToParse = () => {
  for (const [event, props] of trackedCalls()) catalogue[event].schema.parse(props ?? {})
}

const settledObservations = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("observeExtensionMessage", () => {
  let subscription: Subscription

  beforeEach(() => {
    tracked.calls.length = 0
    subscription = requestStore.facts$.subscribe((fact) => dappRequestTracker.onFact(fact))
  })

  afterEach(() => {
    expectTrackedPropsToParse()
    subscription.unsubscribe()
    requestStore.clearRequests()
  })

  describe("transactions", () => {
    it("reports a wallet broadcast as signed then broadcast, once", async () => {
      observeExtensionMessage(
        "pri(eth.signing.signAndSend)",
        WALLET_SEND
      )?.({
        ok: true,
        response: "0xhash",
      })
      await settledObservations()

      expect(trackedEvents()).toEqual(["tx_signed", "tx_broadcast"])
      expect(propsOf("tx_signed")).toEqual({
        platform: "ethereum",
        network_id: "1",
        tx_type: "other",
        submitted_by: "wallet",
        signer: "local",
        sign_only: false,
      })
    })

    it("reports a failed broadcast with its category and no signature", async () => {
      observeExtensionMessage(
        "pri(eth.signing.signAndSend)",
        WALLET_SEND
      )?.({
        ok: false,
        error: new Error("insufficient funds for gas * price + value"),
      })
      await settledObservations()

      expect(trackedEvents()).toEqual(["tx_broadcast_failed"])
      expect(propsOf("tx_broadcast_failed")).toMatchObject({ error_category: "insufficient_gas" })
    })

    it("reports nothing for an approval that resolved false", async () => {
      const id = openEthSend()

      observeExtensionMessage("pri(eth.signing.approveSignAndSend)", {
        id,
        transaction: WALLET_SEND.unsigned,
      })?.({ ok: true, response: false })
      await settledObservations()

      expect(txEvents()).toEqual([])
    })

    it("reports a dapp sign-only approval as signed and never broadcast", async () => {
      const id = openSubstrateSign(JSON_PAYLOAD)

      observeExtensionMessage("pri(signing.approveSign)", { id })?.({ ok: true, response: true })
      await settledObservations()

      expect(txEvents()).toEqual(["tx_signed"])
      expect(propsOf("tx_signed")).toMatchObject({
        platform: "polkadot",
        submitted_by: "dapp",
        sign_only: true,
      })
    })

    it("reports a failed sign-only approval on its dapp request, not as a transaction", async () => {
      const id = openSubstrateSign(JSON_PAYLOAD)

      observeExtensionMessage("pri(signing.approveSign)", { id })?.({
        ok: false,
        error: new Error("Unauthorised"),
      })
      await settledObservations()
      popup.close()

      expect(txEvents()).toEqual([])
      expect(propsOf("dapp_request_resolved")).toMatchObject({
        outcome: "rejected",
        error_category: "wrong_password",
      })
    })

    it("reports no transaction for a raw-bytes signature or an eth message signature", async () => {
      const raw = openSubstrateSign({ address: owned.polkadot, data: "0x1234", type: "bytes" })
      const message = openRequest({
        type: "eth-sign",
        url: DAPP_URL,
        ethChainId: "1",
        account: ETH_ACCOUNT,
        request: "0x1234",
        method: "personal_sign",
        params: [],
      })

      observeExtensionMessage("pri(signing.approveSign)", { id: raw })?.({
        ok: true,
        response: true,
      })
      observeExtensionMessage("pri(eth.signing.approveSign)", { id: message })?.({
        ok: true,
        response: true,
      })
      await settledObservations()

      expect(txEvents()).toEqual([])
    })

    it("reads the approved request when the message arrives, before the handler removes it", async () => {
      const id = openEthSend("137")

      const settle = observeExtensionMessage("pri(eth.signing.approveSignAndSend)", {
        id,
        transaction: WALLET_SEND.unsigned,
      })
      requestStore.deleteRequest(id)
      settle?.({ ok: true, response: true })
      await settledObservations()

      expect(txEvents()).toEqual(["tx_signed", "tx_broadcast"])
      expect(propsOf("tx_broadcast")).toMatchObject({
        platform: "ethereum",
        network_id: "137",
        submitted_by: "dapp",
        signer: "local",
      })
    })
  })

  it("never throws into the dispatcher on a request it cannot read", () => {
    expect(observeExtensionMessage("pri(eth.signing.signAndSend)", null)).toBeNull()
    expect(observeExtensionMessage("pri(signing.approveSign)", undefined)).toBeNull()
  })

  describe("dapp request decisions", () => {
    it("records an approval, which a window closing during it does not undo", () => {
      const id = openEthSend()

      observeExtensionMessage("pri(eth.signing.approveSignAndSend)", {
        id,
        transaction: WALLET_SEND.unsigned,
      })
      popup.close()

      expect(propsOf("dapp_request_resolved")).toMatchObject({ outcome: "approved" })
    })

    it("records a cancel as rejected", () => {
      const id = openSubstrateSign(JSON_PAYLOAD)

      observeExtensionMessage("pri(signing.cancel)", { id })
      popup.close()

      expect(propsOf("dapp_request_resolved")).toMatchObject({ outcome: "rejected" })
    })

    it("records an ignored request as closed, not expired", () => {
      const port = chrome.runtime.connect()
      const id = openRequest(
        {
          type: "auth",
          idStr: "auth-test",
          url: DAPP_URL,
          request: { origin: "Example", provider: "polkadot" },
        },
        port
      )

      observeExtensionMessage("pri(sites.requests.ignore)", { id })
      port.disconnect()

      expect(propsOf("dapp_request_resolved")).toMatchObject({ outcome: "closed" })
    })
  })
})

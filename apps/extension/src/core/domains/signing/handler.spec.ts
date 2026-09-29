import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { getPublicKey, secretFromSeed, verify as sr25519Verify } from "@scure/sr25519"
import type { DotNetwork } from "@talismn/chaindata-provider"
import type { KeypairCurve } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"
import { hexToU8a, u8aToHex, u8aWrapBytes } from "@talismn/util"
import { waitFor } from "@testing-library/dom"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../db"
import { extensionStores } from "../../handlers/stores"
import { talismanAnalytics } from "../../libs/Analytics"
import { requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestType } from "../../types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "../../types/pjsInterop"
import { passwordStore } from "../app/store.password"
import { keyringStore } from "../keyring/store"
import { encodeMetadataRpc } from "../metadata/helpers"
import { watchSubstrateTransaction } from "../transactions/watchSubstrateTransaction"
import SigningHandler from "./handler"
import { requestSubstrateSign, requestVrfSign } from "./requests"

vi.mock("../transactions/watchSubstrateTransaction", () => ({
  watchSubstrateTransaction: vi.fn(),
}))
vi.mock("../../libs/WindowManager", () => ({
  windowManager: { popupOpen: vi.fn(async () => 1), popupClose: vi.fn() },
}))

type ParityFixture = {
  name: string
  curve: KeypairCurve
  secretKey: `0x${string}`
  payload: SignerPayloadJSON
  signature: `0x${string}`
  signedTransaction: `0x${string}`
}

const fixturesDir = path.resolve(__dirname, "../../../../tests/fixtures")
const FIXTURES = JSON.parse(
  readFileSync(path.join(fixturesDir, "pjs-signing-parity.json"), "utf8")
) as ParityFixture[]
const getFixture = (name: string) => {
  const fixture = FIXTURES.find((f) => f.name === name)
  if (!fixture) throw new Error(`Missing fixture ${name}`)
  return fixture
}

const MORTAL = getFixture("polkadot ed25519 mortal")
const METADATA_HASH = getFixture("polkadot ed25519 immortal metadata hash")

// what a dapp sends before the wallet injects CheckMetadataHash
const { metadataHash: _, ...dappPayloadWithoutHash } = METADATA_HASH.payload
const DAPP_PAYLOAD: SignerPayloadJSON = {
  ...dappPayloadWithoutHash,
  mode: 0,
  withSignedTransaction: true,
} as SignerPayloadJSON
const WALLET_PAYLOAD: SignerPayloadJSON = {
  ...METADATA_HASH.payload,
  withSignedTransaction: true,
} as SignerPayloadJSON

const withoutSignedTransaction = ({
  withSignedTransaction: _,
  ...payload
}: SignerPayloadJSON): SignerPayloadJSON => payload as SignerPayloadJSON

// same values as WALLET_PAYLOAD, keys in reverse order
const REORDERED_WALLET_PAYLOAD = Object.fromEntries(
  Object.entries(WALLET_PAYLOAD).reverse()
) as SignerPayloadJSON

const POLKADOT = {
  id: "polkadot",
  genesisHash: MORTAL.payload.genesisHash,
} as DotNetwork

const DAPP_URL = "https://app.example.com/stake"
const PORT = {} as chrome.runtime.Port

const account = (overrides: Partial<Account> = {}) =>
  ({
    type: "keypair",
    curve: "ed25519",
    name: "Test",
    address: MORTAL.payload.address,
    ...overrides,
  }) as Account

const useSecretKey = (secretKey: Uint8Array, curve: KeypairCurve) => {
  vi.spyOn(keyringStore, "getAccount").mockResolvedValue(account({ curve }))
  vi.spyOn(keyringStore, "getAccountSecretKey").mockImplementation(async () => secretKey.slice())
}

const handler = new SigningHandler(extensionStores)
const send = <T extends MessageTypes>(type: T, request: RequestType<T>) =>
  handler.handle("id", type, request, PORT)

const queueSubstrateSign = async (
  payload: SignerPayloadJSON | SignerPayloadRaw,
  queuedAccount = account()
) => {
  const response = requestSubstrateSign(DAPP_URL, { payload }, queuedAccount, PORT)
  response.catch(() => {})
  await waitFor(() => expect(requestStore.getCounts().get("substrate-sign")).toBe(1))
  const [request] = requestStore.allRequests("substrate-sign")
  return { id: request.id, response }
}

const queueVrfSign = async () => {
  const response = requestVrfSign(
    DAPP_URL,
    { payload: { address: MORTAL.payload.address, data: "0x00" } },
    account({ curve: "sr25519" }),
    PORT
  )
  response.catch(() => {})
  await waitFor(() => expect(requestStore.getCounts().get("vrf-sign")).toBe(1))
  const [request] = requestStore.allRequests("vrf-sign")
  return { id: request.id, response }
}

describe("SigningHandler", () => {
  beforeAll(async () => {
    const metadataHex = u8aToHex(
      Uint8Array.from(
        gunzipSync(readFileSync(path.join(fixturesDir, "polkadot-metadata-v15.scale.gz")))
      )
    )
    await db.metadata.put({
      genesisHash: POLKADOT.genesisHash,
      chain: "Polkadot",
      icon: "",
      specVersion: parseInt(MORTAL.payload.specVersion, 16),
      ss58Format: 0,
      tokenDecimals: 10,
      tokenSymbol: "DOT",
      types: {},
      metadataRpc: encodeMetadataRpc(metadataHex) as `0x${string}`,
    })
  })

  beforeEach(() => {
    requestStore.clearRequests()
    vi.spyOn(chaindataProvider, "getNetworkByGenesisHash").mockResolvedValue(POLKADOT)
    vi.spyOn(talismanAnalytics, "captureDelayed").mockResolvedValue(undefined)
    vi.spyOn(passwordStore, "getPassword").mockResolvedValue("hashed")
    vi.spyOn(passwordStore, "clearPassword").mockResolvedValue(undefined)
    useSecretKey(hexToU8a(MORTAL.secretKey), MORTAL.curve)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe("pri(signing.approveSign)", () => {
    it("signs a payload with the account key and watches the transaction", async () => {
      const { id, response } = await queueSubstrateSign(MORTAL.payload)

      await expect(send("pri(signing.approveSign)", { id })).resolves.toBe(true)

      await expect(response).resolves.toEqual({
        id,
        signature: MORTAL.signature,
        signedTransaction: undefined,
      })
      expect(watchSubstrateTransaction).toHaveBeenCalledWith(
        POLKADOT,
        MORTAL.payload,
        MORTAL.signature,
        { siteUrl: DAPP_URL, notifications: true }
      )
      expect(talismanAnalytics.captureDelayed).toHaveBeenCalledWith("sign transaction approve", {
        dapp: DAPP_URL,
        hostName: "app.example.com",
        chain: "polkadot",
        networkType: "substrate",
      })
    })

    it("still signs, without watching, on a chain missing from chaindata", async () => {
      vi.mocked(chaindataProvider.getNetworkByGenesisHash).mockResolvedValue(null as never)
      const { id, response } = await queueSubstrateSign(MORTAL.payload)

      await send("pri(signing.approveSign)", { id })

      await expect(response).resolves.toMatchObject({ signature: MORTAL.signature })
      expect(watchSubstrateTransaction).not.toHaveBeenCalled()
    })

    it("drops the signature type prefix when chaindata says the chain has none", async () => {
      vi.mocked(chaindataProvider.getNetworkByGenesisHash).mockResolvedValue({
        ...POLKADOT,
        hasExtrinsicSignatureTypePrefix: false,
      })
      const { id, response } = await queueSubstrateSign(MORTAL.payload)

      await send("pri(signing.approveSign)", { id })

      // fixture signatures start with the ed25519 MultiSignature type byte 0x00
      const { signature } = await response
      expect(signature).toBe(`0x${MORTAL.signature.slice(4)}`)
    })

    it("returns the signed transaction when the wallet altered the payload", async () => {
      useSecretKey(hexToU8a(METADATA_HASH.secretKey), METADATA_HASH.curve)
      const { id, response } = await queueSubstrateSign(DAPP_PAYLOAD)

      await send("pri(signing.approveSign)", { id, payload: WALLET_PAYLOAD })

      await expect(response).resolves.toEqual({
        id,
        signature: METADATA_HASH.signature,
        signedTransaction: METADATA_HASH.signedTransaction,
      })
    })

    it("returns no signed transaction to a dapp that did not ask for one", async () => {
      useSecretKey(hexToU8a(METADATA_HASH.secretKey), METADATA_HASH.curve)
      const { id, response } = await queueSubstrateSign(withoutSignedTransaction(DAPP_PAYLOAD))

      await send("pri(signing.approveSign)", {
        id,
        payload: withoutSignedTransaction(WALLET_PAYLOAD),
      })

      await expect(response).resolves.toEqual({
        id,
        signature: METADATA_HASH.signature,
        signedTransaction: undefined,
      })
    })

    // older @polkadot/api rebuilds a returned extrinsic without chain-specific fields
    // (Avail's appId), which then fails with "1010: bad signature"
    it.each([
      ["no payload", undefined],
      ["an identical payload", { ...WALLET_PAYLOAD }],
    ])("withholds the signed transaction when the approval sends %s", async (_, payload) => {
      useSecretKey(hexToU8a(METADATA_HASH.secretKey), METADATA_HASH.curve)
      const { id, response } = await queueSubstrateSign(WALLET_PAYLOAD)

      await send("pri(signing.approveSign)", { id, payload })

      await expect(response).resolves.toEqual({
        id,
        signature: METADATA_HASH.signature,
        signedTransaction: undefined,
      })
    })

    it("withholds the signed transaction when the approval sends a reordered payload", async () => {
      const { id, response } = await queueSubstrateSign(WALLET_PAYLOAD)

      await send("pri(signing.approveSign)", { id, payload: REORDERED_WALLET_PAYLOAD })

      await expect(response).resolves.toMatchObject({ signedTransaction: undefined })
    })

    describe("raw bytes", () => {
      const secretKey = secretFromSeed(new Uint8Array(32).fill(7))
      const publicKey = getPublicKey(secretKey)
      const message = new TextEncoder().encode("sign in to talisman")

      it("signs the <Bytes>-wrapped message without a type prefix", async () => {
        useSecretKey(secretKey, "sr25519")
        const { id, response } = await queueSubstrateSign({
          address: MORTAL.payload.address,
          data: u8aToHex(message),
          type: "bytes",
        })

        await send("pri(signing.approveSign)", { id })

        const signature = hexToU8a((await response).signature)
        expect(signature).toHaveLength(64)
        expect(sr25519Verify(u8aWrapBytes(message), signature, publicKey)).toBe(true)
        expect(sr25519Verify(message, signature, publicKey)).toBe(false)
        expect(watchSubstrateTransaction).not.toHaveBeenCalled()
        expect(talismanAnalytics.captureDelayed).toHaveBeenCalledWith(
          "sign approve",
          expect.objectContaining({ networkType: "substrate" })
        )
      })

      it("does not wrap an already wrapped message twice", async () => {
        useSecretKey(secretKey, "sr25519")
        const wrapped = u8aWrapBytes(message)
        const { id, response } = await queueSubstrateSign({
          address: MORTAL.payload.address,
          data: u8aToHex(wrapped),
          type: "bytes",
        })

        await send("pri(signing.approveSign)", { id })

        const signature = hexToU8a((await response).signature)
        expect(sr25519Verify(wrapped, signature, publicKey)).toBe(true)
      })
    })

    it.each([
      ["Unauthorised", () => vi.mocked(passwordStore.getPassword).mockResolvedValue(undefined)],
      ["Account not found", () => vi.mocked(keyringStore.getAccount).mockResolvedValue(null)],
      [
        "Private key unavailable",
        () => vi.mocked(keyringStore.getAccount).mockResolvedValue(account({ type: "watch-only" })),
      ],
    ] as const)(
      "rejects the queued request when the key is unavailable: %s",
      async (reason, makeKeyUnavailable) => {
        makeKeyUnavailable()
        const { id, response } = await queueSubstrateSign(MORTAL.payload)

        await expect(send("pri(signing.approveSign)", { id })).rejects.toThrow(reason)
        await expect(response).rejects.toThrow(reason)
        expect(requestStore.getCounts().get("substrate-sign")).toBe(0)
      }
    )

    it("refuses to approve a VRF request", async () => {
      const { id } = await queueVrfSign()

      await expect(send("pri(signing.approveSign)", { id: id as never })).rejects.toThrow(
        "Not a substrate signing request"
      )
      expect(keyringStore.getAccountSecretKey).not.toHaveBeenCalled()
      expect(requestStore.getCounts().get("vrf-sign")).toBe(1)
    })

    it("fails on an unknown request id", async () => {
      await expect(
        send("pri(signing.approveSign)", { id: "substrate-sign.unknown" })
      ).rejects.toThrow("Unable to find request")
    })
  })

  describe.each([
    ["pri(signing.approveSign.hardware)", "ledger-polkadot", "ledger"],
    ["pri(signing.approveSign.qr)", "polkadot-vault", "qr"],
  ] as const)("%s", (type, accountType, hardwareType) => {
    const externalAccount = account({ type: accountType } as Partial<Account>)

    it("resolves with the external signature and watches the transaction", async () => {
      const { id, response } = await queueSubstrateSign(MORTAL.payload, externalAccount)

      await expect(send(type, { id, signature: MORTAL.signature })).resolves.toBe(true)

      await expect(response).resolves.toEqual({
        id,
        signature: MORTAL.signature,
        signedTransaction: undefined,
      })
      expect(keyringStore.getAccountSecretKey).not.toHaveBeenCalled()
      expect(watchSubstrateTransaction).toHaveBeenCalledWith(
        POLKADOT,
        MORTAL.payload,
        MORTAL.signature,
        { siteUrl: DAPP_URL, notifications: true }
      )
      expect(talismanAnalytics.captureDelayed).toHaveBeenCalledWith("sign transaction approve", {
        dapp: DAPP_URL,
        hostName: "app.example.com",
        chain: "polkadot",
        networkType: "substrate",
        hardwareType,
      })
    })

    it("assembles the signed transaction when the wallet altered the payload", async () => {
      const { id, response } = await queueSubstrateSign(DAPP_PAYLOAD, externalAccount)

      await send(type, { id, signature: METADATA_HASH.signature, payload: WALLET_PAYLOAD })

      await expect(response).resolves.toMatchObject({
        signedTransaction: METADATA_HASH.signedTransaction,
      })
    })

    it("returns no signed transaction to a dapp that did not ask for one", async () => {
      const { id, response } = await queueSubstrateSign(
        withoutSignedTransaction(DAPP_PAYLOAD),
        externalAccount
      )

      await send(type, {
        id,
        signature: METADATA_HASH.signature,
        payload: withoutSignedTransaction(WALLET_PAYLOAD),
      })

      await expect(response).resolves.toMatchObject({ signedTransaction: undefined })
    })

    it("withholds the signed transaction when the payload is unchanged", async () => {
      const { id, response } = await queueSubstrateSign(WALLET_PAYLOAD, externalAccount)

      await send(type, { id, signature: METADATA_HASH.signature, payload: { ...WALLET_PAYLOAD } })

      await expect(response).resolves.toMatchObject({ signedTransaction: undefined })
    })

    it("withholds the signed transaction when the payload is only reordered", async () => {
      const { id, response } = await queueSubstrateSign(WALLET_PAYLOAD, externalAccount)

      await send(type, {
        id,
        signature: METADATA_HASH.signature,
        payload: REORDERED_WALLET_PAYLOAD,
      })

      await expect(response).resolves.toMatchObject({ signedTransaction: undefined })
    })

    it("cannot assemble the signed transaction on a chain missing from chaindata", async () => {
      vi.mocked(chaindataProvider.getNetworkByGenesisHash).mockResolvedValue(null as never)
      const { id, response } = await queueSubstrateSign(DAPP_PAYLOAD, externalAccount)

      await send(type, { id, signature: METADATA_HASH.signature, payload: WALLET_PAYLOAD })

      await expect(response).resolves.toMatchObject({ signedTransaction: undefined })
      expect(watchSubstrateTransaction).not.toHaveBeenCalled()
    })

    it("refuses to approve a VRF request", async () => {
      const { id } = await queueVrfSign()

      await expect(send(type, { id: id as never, signature: MORTAL.signature })).rejects.toThrow(
        "Not a substrate signing request"
      )
      expect(requestStore.getCounts().get("vrf-sign")).toBe(1)
    })
  })

  describe("pri(signing.cancel)", () => {
    it("rejects a substrate request", async () => {
      const { id, response } = await queueSubstrateSign(MORTAL.payload)

      await expect(send("pri(signing.cancel)", { id })).resolves.toBe(true)

      await expect(response).rejects.toThrow("Cancelled")
      expect(requestStore.getCounts().get("substrate-sign")).toBe(0)
      expect(talismanAnalytics.captureDelayed).toHaveBeenCalledWith("sign reject", {
        networkType: "substrate",
      })
    })

    it("rejects a VRF request", async () => {
      const { id, response } = await queueVrfSign()

      await send("pri(signing.cancel)", { id })

      await expect(response).rejects.toThrow("Cancelled")
      expect(talismanAnalytics.captureDelayed).toHaveBeenCalledWith("vrf sign reject", {
        networkType: "substrate",
      })
    })
  })

  describe("pri(signing.approveSign.signet)", () => {
    it("opens the Signet signing page and closes the popup", async () => {
      const createTab = vi.spyOn(chrome.tabs, "create")
      const signetAccount = account({
        type: "signet",
        url: "https://signet.example.com",
        genesisHash: POLKADOT.genesisHash,
      } as Partial<Account>)
      const { id } = await queueSubstrateSign(MORTAL.payload, signetAccount)

      await expect(send("pri(signing.approveSign.signet)", { id })).resolves.toBe(true)

      expect(windowManager.popupClose).toHaveBeenCalled()
      const url = new URL(createTab.mock.calls[0][0].url as string)
      expect(url.origin + url.pathname).toBe("https://signet.example.com/sign")
      expect(Object.fromEntries(url.searchParams)).toEqual({
        id,
        calldata: MORTAL.payload.method,
        account: MORTAL.payload.address,
        genesisHash: POLKADOT.genesisHash,
        dapp: DAPP_URL,
      })
      expect(createTab.mock.calls[0][0].active).toBe(true)
    })

    it("refuses a request from a non-Signet account", async () => {
      const { id } = await queueSubstrateSign(MORTAL.payload)

      await expect(send("pri(signing.approveSign.signet)", { id })).rejects.toThrow(
        "Invalid Signet account"
      )
    })
  })
})

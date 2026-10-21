import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { Blake2256, getSs58AddressInfo } from "@polkadot-api/substrate-bindings"
import type { TxPayloadV1 } from "@polkadot-api/tx-creator"
import { mergeUint8 } from "@polkadot-api/utils"
import { base64 } from "@scure/base"
import { verify as sr25519Verify } from "@scure/sr25519"
import type { Account } from "@talismn/keyring"
import { CUSTOM_SIGNED_EXTENSIONS, getPjsTxHelper } from "@talismn/sapi"
import { sr25519VerifyVrf } from "@talismn/substrate-vrf"
import { hexToU8a, u8aToHex } from "@talismn/util"
import { waitFor } from "@testing-library/dom"
import { v4 } from "uuid"
import { beforeAll, beforeEach, describe, expect, vi } from "vitest"
import { getMessageSenderFn } from "../../../tests/core/util"
import { db } from "../db"
import { passwordStore } from "../domains/app/store.password"
import { keyringStore } from "../domains/keyring/store"
import { requestSubstrateSign, requestVrfSign } from "../domains/signing/requests"
import type { VrfSignPayload } from "../domains/signing/types"
import { requestStore } from "../libs/requests/store"
import type { SignerPayloadJSON } from "../types/pjsInterop"
import Extension from "./Extension"
import { extensionStores } from "./stores"
import Tabs from "./Tabs"

// the phishing lists are fetched over the network on first use, which every `pub(*)` message
// would otherwise wait on
vi.mock("../domains/app/protector", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../domains/app/protector")>()),
  getPhishingSource: async () => undefined,
}))

vi.setConfig({ testTimeout: 10_000 })

const DAPP_URL = "http://localhost:3000"

describe("Extension", () => {
  let extension: Extension
  let tabs: Tabs
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space
  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    extensionStores.sites.set({
      "localhost:3000": {
        addresses: [],
        id: "11",
        origin: "example.com",
        url: "http://localhost:3000",
      },
    })

    return new Extension(extensionStores)
  }

  const getAccount = async () => {
    const accounts = await keyringStore.getAccounts()
    const account = accounts.find(({ name }) => name === "Test Polkadot Account")
    expect(account).toBeDefined()

    if (!account) throw new Error("Account not found")
    return account
  }

  beforeAll(async () => {
    await chrome.storage.local.clear()
    extension = await createExtension()
    tabs = new Tabs(extensionStores)
    messageSender = getMessageSenderFn(extension)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password,
      passConfirm: password,
    })
    const [address] = await messageSender("pri(accounts.add.derive)", [
      {
        type: "new-mnemonic",
        mnemonic: mnemonic,
        mnemonicName: "Test Mnemonic",
        derivationPath: "",
        name: "Test Polkadot Account",
        curve: "sr25519",
        confirmed: false,
      },
    ])

    mnemonicId = (await keyringStore.getExistingMnemonicId(mnemonic)) as string

    // hardhat #0, only used to exercise the "must be sr25519" checks
    const [ethAddress] = await messageSender("pri(accounts.add.keypair)", [
      {
        name: "Test Ethereum Account",
        curve: "ethereum",
        secretKey: base64.encode(
          hexToU8a("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
        ),
      },
    ])

    const [watchOnlyAddress] = await messageSender("pri(accounts.add.external)", [
      {
        type: "watch-only",
        address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        name: "Test Watch Only Account",
        isPortfolio: false,
      },
    ])

    await extensionStores.sites.updateSite("localhost:3000", {
      addresses: [address, ethAddress, watchOnlyAddress],
    })
    await extensionStores.app.setOnboarded()
  })

  beforeEach(async () => {
    await messageSender("pri(app.authenticate)", {
      pass: password,
    })
  })

  test("user can be onboarded", async () => {
    expect(await extensionStores.app.getIsOnboarded()).toBeTruthy()
    expect(extensionStores.password.hasPassword).toBeTruthy()
  })

  test("exports account from keyring", async () => {
    // need to use the pw from the store, because it may need to be trimmed
    const pw = await passwordStore.getPassword()
    expect(pw).toBeTruthy()

    const { address } = await getAccount()

    const exportPw = "newPassword"

    const result = await extension.handle(
      "id",
      "pri(accounts.export)",
      {
        address,
        password,
        exportPw,
      },
      {} as chrome.runtime.Port
    )

    expect(result.exportedJson.address).toBe(address)
    expect(result.exportedJson.encoded).toBeDefined()
  })

  describe("substrate payload signing", () => {
    // Signing requires real chain metadata (polkadot-js userExtensions signing was dropped
    // with the polkadot-api migration) — seed the metadata cache with a real polkadot v15 blob.
    const POLKADOT_GENESIS = "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
    const SPEC_VERSION = 2003000

    let account: Account
    let metadataHex: `0x${string}`
    let signedExtensions: string[]

    beforeAll(async () => {
      const [{ gunzipSync }, { readFileSync }, path] = await Promise.all([
        import("node:zlib"),
        import("node:fs"),
        import("node:path"),
      ])
      const metadataBytes = gunzipSync(
        readFileSync(
          path.resolve(__dirname, "../../../tests/fixtures/polkadot-metadata-v15.scale.gz")
        )
      )
      metadataHex = `0x${Buffer.from(metadataBytes).toString("hex")}`

      const { getSignedExtensions, parseMetadataRpc } = await import("@talismn/scale")
      signedExtensions = getSignedExtensions(parseMetadataRpc(metadataHex).unifiedMetadata).map(
        (e) => e.identifier
      )

      const { encodeMetadataRpc } = await import("../domains/metadata/helpers")
      await db.metadata.put({
        genesisHash: POLKADOT_GENESIS,
        chain: "Polkadot",
        icon: "",
        specVersion: SPEC_VERSION,
        ss58Format: 0,
        tokenDecimals: 10,
        tokenSymbol: "DOT",
        types: {},
        // the metadataRpc field actually holds base64 despite its hex-string type (pre-existing type lie)
        metadataRpc: encodeMetadataRpc(metadataHex) as `0x${string}`,
      })
    })

    beforeEach(async () => {
      requestStore.clearRequests()
      // need to use the pw from the store, because it may need to be trimmed
      account = await getAccount()
    })

    const getPayload = (): SignerPayloadJSON =>
      ({
        address: account.address,
        blockHash: "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80",
        blockNumber: "0x00000393",
        era: "0x3601",
        genesisHash: POLKADOT_GENESIS,
        // System.remark("talisman parity")
        method: "0x00003c74616c69736d616e20706172697479",
        nonce: "0x00000000",
        signedExtensions,
        specVersion: `0x${SPEC_VERSION.toString(16).padStart(8, "0")}`,
        tip: "0x00000000000000000000000000000000",
        transactionVersion: "0x00000005",
        mode: 0,
        version: 4,
      }) as unknown as SignerPayloadJSON

    test("signs a payload using cached chain metadata", async () => {
      const payload = getPayload()

      const requestPromise = requestSubstrateSign(
        "http://test.com",
        { payload },
        account,
        {} as chrome.runtime.Port
      )

      await waitFor(() => expect(requestStore.getCounts().get("substrate-sign")).toBe(1))

      const request = requestStore.allRequests("substrate-sign")[0]

      const approveMessage = await messageSender("pri(signing.approveSign)", {
        id: request.id,
      })

      expect(approveMessage).toEqual(true)

      const { signature } = await requestPromise

      // rebuild the signing input and verify the (type-prefixed) sr25519 signature
      const { callData, extra, additionalSigned } = getPjsTxHelper(
        metadataHex,
        CUSTOM_SIGNED_EXTENSIONS
      )(payload)
      const signingInput = mergeUint8([callData, extra, additionalSigned])
      const sigBytes = Buffer.from(signature.slice(2), "hex")
      expect(sigBytes[0]).toBe(1) // MultiSignature type prefix: sr25519
      const addressInfo = getSs58AddressInfo(account.address)
      if (!addressInfo.isValid) throw new Error("Invalid address")
      expect(sr25519Verify(signingInput, sigBytes.subarray(1), addressInfo.publicKey)).toBe(true)
    })

    describe("createTransaction", () => {
      const BLOCK_HASH = "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80"
      // System.remark of 300 bytes, so the signing input goes over 256 bytes and gets hashed
      const CALL_DATA = `0x0000b104${"61".repeat(300)}`
      // mortality, nonce 7, no tip, metadata hash disabled
      const EXTRA = "0x36011c0000"
      // spec version, transaction version, genesis, mortality checkpoint, no metadata hash
      const ADDITIONAL_SIGNED = `0x38901e001a000000${POLKADOT_GENESIS.slice(2)}${BLOCK_HASH.slice(2)}00`

      const txPayload = (signer: string | null): TxPayloadV1 => ({
        version: 1,
        signer,
        callData: CALL_DATA,
        extensions: [
          { id: "CheckSpecVersion", extra: "0x", additionalSigned: "0x38901e00" },
          { id: "CheckTxVersion", extra: "0x", additionalSigned: "0x1a000000" },
          { id: "CheckGenesis", extra: "0x", additionalSigned: POLKADOT_GENESIS },
          { id: "CheckMortality", extra: "0x3601", additionalSigned: BLOCK_HASH },
          { id: "CheckNonce", extra: "0x1c", additionalSigned: "0x" },
          { id: "ChargeTransactionPayment", extra: "0x00", additionalSigned: "0x" },
          { id: "CheckMetadataHash", extra: "0x00", additionalSigned: "0x00" },
        ],
        txExtVersion: null,
        context: {
          metadata: "0x6d657461",
          token: { symbol: "DOT", decimals: 10 },
          bestBlockHeight: 915,
          bestBlockHash: BLOCK_HASH,
          genesisHash: POLKADOT_GENESIS,
        },
      })

      const withCheckGenesis = (payload: TxPayloadV1, additionalSigned: string) =>
        payload.extensions.map((extension) =>
          extension.id === "CheckGenesis" ? { ...extension, additionalSigned } : extension
        )

      const createTransaction = (payload: TxPayloadV1) =>
        tabs.handle(v4(), "pub(extrinsic.create)", payload, {} as chrome.runtime.Port, DAPP_URL)

      const queuedRequest = async () => {
        await waitFor(() => expect(requestStore.getCounts().get("substrate-sign")).toBe(1))
        return requestStore.allRequests("substrate-sign")[0]
      }

      const expectSignedExtrinsic = (
        transaction: Uint8Array,
        {
          length,
          extra,
          additionalSigned,
        }: { length: string; extra: string; additionalSigned: string }
      ) => {
        const addressInfo = getSs58AddressInfo(account.address)
        if (!addressInfo.isValid) throw new Error("Invalid address")
        // compact length, signed v4, MultiAddress::Id, MultiSignature::Sr25519, extra, call
        expect(u8aToHex(transaction.subarray(0, 4))).toBe(`${length}8400`)
        expect(u8aToHex(transaction.subarray(4, 36))).toBe(u8aToHex(addressInfo.publicKey))
        expect(transaction[36]).toBe(1)
        const signature = transaction.subarray(37, 101)
        expect(u8aToHex(transaction.subarray(101))).toBe(`${extra}${CALL_DATA.slice(2)}`)

        const signingInput = Blake2256(
          hexToU8a(`${CALL_DATA}${extra.slice(2)}${additionalSigned.slice(2)}`)
        )
        expect(sr25519Verify(signingInput, signature, addressInfo.publicKey)).toBe(true)
      }

      test("returns the signed extrinsic once the user approves", async () => {
        const transactionPromise = createTransaction(txPayload(account.address))
        const request = await queuedRequest()
        expect(request.request.method).toBe("createTransaction")
        await messageSender("pri(signing.approveSign)", { id: request.id })

        expectSignedExtrinsic(hexToU8a(await transactionPromise), {
          length: "0x6106", // 408 bytes
          extra: EXTRA,
          additionalSigned: ADDITIONAL_SIGNED,
        })
      })

      test("returns the wallet's extrinsic when the wallet adds the metadata hash", async () => {
        const metadataHash = `0x${"ab".repeat(32)}` as const
        const transactionPromise = createTransaction(txPayload(account.address))
        const request = await queuedRequest()
        await messageSender("pri(signing.approveSign)", {
          id: request.id,
          payload: { ...(request.request.payload as SignerPayloadJSON), mode: 1, metadataHash },
        })

        expectSignedExtrinsic(hexToU8a(await transactionPromise), {
          length: "0x6106",
          extra: "0x36011c0001",
          additionalSigned: `${ADDITIONAL_SIGNED.slice(0, -2)}01${metadataHash.slice(2)}`,
        })
      })

      test("rejects when the user rejects", async () => {
        const transactionPromise = createTransaction(txPayload(account.address))
        const request = await queuedRequest()
        await messageSender("pri(signing.cancel)", { id: request.id })

        await expect(transactionPromise).rejects.toThrow("Cancelled")
      })

      test("asks the user before the chain metadata is available", async () => {
        const unknownGenesis = `0x${"42".repeat(32)}` as const
        const payload = txPayload(account.address)
        const transactionPromise = createTransaction({
          ...payload,
          extensions: withCheckGenesis(payload, unknownGenesis),
          context: { ...payload.context, genesisHash: unknownGenesis },
        })
        transactionPromise.catch(() => {})

        const request = await queuedRequest()

        expect(request.request.payload).toMatchObject({ genesisHash: unknownGenesis })
      })

      test("rejects on approval an extension the wallet cannot reproduce", async () => {
        const payload = txPayload(account.address)
        const transactionPromise = createTransaction({
          ...payload,
          extensions: withCheckGenesis(payload, BLOCK_HASH),
        })
        transactionPromise.catch(() => {})
        const request = await queuedRequest()

        await expect(messageSender("pri(signing.approveSign)", { id: request.id })).rejects.toThrow(
          "Unsupported value for transaction extension CheckGenesis"
        )
        await expect(transactionPromise).rejects.toThrow(
          "Unsupported value for transaction extension CheckGenesis"
        )
      })

      test("returns the extrinsic a hardware wallet signed", async () => {
        const signature = `0x01${"cd".repeat(64)}` as const
        const transactionPromise = createTransaction(txPayload(account.address))
        const request = await queuedRequest()
        await messageSender("pri(signing.approveSign.hardware)", { id: request.id, signature })

        const transaction = await transactionPromise
        expect(transaction.slice(-(EXTRA.length - 2 + CALL_DATA.length - 2))).toBe(
          `${EXTRA.slice(2)}${CALL_DATA.slice(2)}`
        )
        expect(transaction).toContain(signature.slice(2))
      })

      test("rejects a hardware approval when an extension does not match", async () => {
        const payload = txPayload(account.address)
        const transactionPromise = createTransaction({
          ...payload,
          extensions: withCheckGenesis(payload, BLOCK_HASH),
        })
        transactionPromise.catch(() => {})
        const request = await queuedRequest()

        await expect(
          messageSender("pri(signing.approveSign.hardware)", {
            id: request.id,
            signature: `0x01${"cd".repeat(64)}`,
          })
        ).rejects.toThrow("Unsupported value for transaction extension CheckGenesis")
        await expect(transactionPromise).rejects.toThrow(
          "Unsupported value for transaction extension CheckGenesis"
        )
        expect(requestStore.getCounts().get("substrate-sign")).toBe(0)
      })

      test("rejects a payload without a signer before asking the user", async () => {
        await expect(createTransaction(txPayload(null))).rejects.toThrow(/Missing signer/)
        expect(requestStore.getCounts().get("substrate-sign")).toBe(0)
      })
    })
  })

  describe("vrf signing", () => {
    beforeEach(async () => {
      requestStore.clearRequests()
    })

    const sendVrfSign = (payload: VrfSignPayload, url = DAPP_URL) =>
      tabs.handle(v4(), "pub(vrf.sign)", payload, {} as chrome.runtime.Port, url)

    const signVrfOnce = async (account: Account, data: `0x${string}`, url = DAPP_URL) => {
      const requestPromise = sendVrfSign({ address: account.address, data }, url)

      await waitFor(() => expect(requestStore.getCounts().get("vrf-sign")).toBe(1))

      const request = requestStore.allRequests("vrf-sign")[0]
      const approveMessage = await messageSender("pri(signing.approveSign.vrf)", {
        id: request.id,
      })
      expect(approveMessage).toEqual(true)

      const { signature } = await requestPromise
      requestStore.clearRequests()
      return signature
    }

    test("signs with a deterministic, verifiable VRF output", async () => {
      const account = await getAccount()
      const data = u8aToHex(new TextEncoder().encode("talisman vrf test"))

      const sig1 = await signVrfOnce(account, data)
      const sig2 = await signVrfOnce(account, data)

      // output(32) || proof(64)
      expect(sig1.length).toBe(2 + 96 * 2)
      // only the output is deterministic
      expect(sig1.slice(0, 66)).toBe(sig2.slice(0, 66))

      const addressInfo = getSs58AddressInfo(account.address)
      if (!addressInfo.isValid) throw new Error("Invalid address")
      const sigBytes = Buffer.from(sig1.slice(2), "hex")
      const msgBytes = Buffer.from(data.slice(2), "hex")
      // verifying through the namespace proves the handler applies the origin and context frame
      const origin = new URL(DAPP_URL).origin
      expect(sr25519VerifyVrf(addressInfo.publicKey, msgBytes, sigBytes, { origin })).toBe(true)
      // the output is bound to the requesting site, so no other site can obtain it
      expect(
        sr25519VerifyVrf(addressInfo.publicKey, msgBytes, sigBytes, {
          origin: "https://evil.example.com",
        })
      ).toBe(false)
    })

    // the namespace binds `scheme://host`, so schemes never share an identity even though site
    // authorization is host-keyed
    test("derives a different output for http and https on the same host", async () => {
      const account = await getAccount()
      const data = u8aToHex(new TextEncoder().encode("talisman vrf test"))

      const httpSig = await signVrfOnce(account, data)
      const httpsSig = await signVrfOnce(account, data, "https://localhost:3000")

      expect(httpsSig.slice(0, 66)).not.toBe(httpSig.slice(0, 66))

      const addressInfo = getSs58AddressInfo(account.address)
      if (!addressInfo.isValid) throw new Error("Invalid address")
      const msgBytes = Buffer.from(data.slice(2), "hex")
      const httpsSigBytes = Buffer.from(httpsSig.slice(2), "hex")
      expect(
        sr25519VerifyVrf(addressInfo.publicKey, msgBytes, httpsSigBytes, {
          origin: "https://localhost:3000",
        })
      ).toBe(true)
      // a bare host — the namespace value before the scheme was included — must not verify
      expect(
        sr25519VerifyVrf(addressInfo.publicKey, msgBytes, httpsSigBytes, {
          origin: "localhost:3000",
        })
      ).toBe(false)
    })

    test.each([
      ["invalid hex digits", "0xzz"],
      ["odd length", "0x1"],
      ["a missing 0x prefix", "1234"],
      ["an empty string", ""],
    ])("rejects data with %s", async (_, data) => {
      const account = await getAccount()

      await expect(sendVrfSign({ address: account.address, data })).rejects.toThrow(/Invalid data/)
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // an omitted context means "empty"; "0x" is how a caller asks for empty bytes
    test("rejects an empty context string", async () => {
      const account = await getAccount()

      await expect(
        sendVrfSign({ address: account.address, data: "0x00", context: "" })
      ).rejects.toThrow(/Invalid context/)
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // refused rather than ignored: a caller using extra as a domain separator must find out
    test("rejects extra transcript data", async () => {
      const account = await getAccount()

      await expect(
        sendVrfSign({ address: account.address, data: "0x00", extra: "0x00" } as VrfSignPayload)
      ).rejects.toThrow(/Invalid extra/)
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    test("rejects oversized data", async () => {
      const account = await getAccount()
      const data = `0x${"00".repeat(64 * 1024 + 1)}`

      await expect(sendVrfSign({ address: account.address, data })).rejects.toThrow(/Invalid data/)
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // both predicates matter: ethereum isolates the curve check, watch-only the account type
    test.each([
      ["a non-sr25519 keypair", "Test Ethereum Account"],
      ["a watch-only account", "Test Watch Only Account"],
    ])("rejects %s", async (_, name) => {
      const accounts = await keyringStore.getAccounts()
      const account = accounts.find((acc) => acc.name === name)
      expect(account).toBeDefined()
      if (!account) throw new Error("Account not found")

      await expect(sendVrfSign({ address: account.address, data: "0x00" })).rejects.toThrow(
        /VRF signing requires a local sr25519 account/
      )
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // queued directly, to get past the `pub(vrf.sign)` account check and fail inside the handler
    test("rejects the queued request when approval fails", async () => {
      const accounts = await keyringStore.getAccounts()
      const account = accounts.find((acc) => acc.name === "Test Ethereum Account")
      if (!account) throw new Error("Account not found")

      const requestPromise = requestVrfSign(
        DAPP_URL,
        { payload: { address: account.address, data: "0x00" } },
        account,
        {} as chrome.runtime.Port
      )

      await waitFor(() => expect(requestStore.getCounts().get("vrf-sign")).toBe(1))
      const request = requestStore.allRequests("vrf-sign")[0]

      await expect(
        messageSender("pri(signing.approveSign.vrf)", { id: request.id })
      ).rejects.toThrow(/only supported for sr25519/)
      await expect(requestPromise).rejects.toThrow(/only supported for sr25519/)
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    test("refuses to VRF-sign a substrate signing request", async () => {
      const account = await getAccount()
      // a raw payload's `data` also parses as a VrfSignPayload
      requestSubstrateSign(
        DAPP_URL,
        { payload: { address: account.address, data: "0x00", type: "bytes" } },
        account,
        {} as chrome.runtime.Port
      ).catch(() => {})

      await waitFor(() => expect(requestStore.getCounts().get("substrate-sign")).toBe(1))
      const request = requestStore.allRequests("substrate-sign")[0]

      await expect(
        messageSender("pri(signing.approveSign.vrf)", {
          id: request.id as never,
        })
      ).rejects.toThrow(/Not a VRF signing request/)

      expect(requestStore.getCounts().get("substrate-sign")).toBe(1)
    })
  })

  describe("dapp-provided metadata", () => {
    // Runtime metadata decides how a transaction is rendered on the sign screen while the bytes
    // signed are the dapp's own payload, so a dapp must never be able to supply it.
    const DAPP_GENESIS =
      "0x0000000000000000000000000000000000000000000000000000000000000181" as const

    beforeEach(() => {
      requestStore.clearRequests()
    })

    test("is never queued for approval, nor allowed to replace our own", async () => {
      const trusted = {
        genesisHash: DAPP_GENESIS,
        chain: "Trusted Chain",
        icon: "",
        specVersion: 1,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: "TRUST",
        types: {},
        metadataRpc: "trusted-metadata" as `0x${string}`,
      }
      await db.metadata.put(trusted)

      const result = await tabs.handle(
        v4(),
        "pub(metadata.provide)",
        // a dapp can put anything on the wire, including the `metadataRpc` field we no longer declare
        { ...trusted, chain: "Poisoned Chain", metadataRpc: "poisoned-metadata" } as never,
        {} as chrome.runtime.Port,
        DAPP_URL
      )

      expect(result).toBe(true)
      expect(requestStore.allRequests()).toHaveLength(0)
      expect(await db.metadata.get(DAPP_GENESIS)).toStrictEqual(trusted)
    })
  })

  test("new accounts are added to authorised sites with connectAllSubstrate automatically", async () => {
    // app.talisman.xyz should already be in the authorised sites store after onboarding
    const account = await getAccount()
    const talismanSite = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(talismanSite?.addresses)
    expect(talismanSite.addresses?.includes(account.address))

    const [newAddress] = await messageSender("pri(accounts.add.derive)", [
      {
        type: "existing-mnemonic",
        name: "AutoAdd",
        curve: "sr25519",
        mnemonicId,
        derivationPath: "//Other",
      },
    ])

    const sites = await extensionStores.sites.get()
    const talismanSiteAgain = sites[TALISMAN_WEB_APP_DOMAIN]
    expect(talismanSiteAgain.addresses?.includes(newAddress))

    const otherSite = Object.values(sites).find((site) => !site.connectAllSubstrate)
    expect(otherSite)
    expect(otherSite?.addresses?.includes(newAddress)).toBeFalsy()
  })
})

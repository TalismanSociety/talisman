import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { getSs58AddressInfo } from "@polkadot-api/substrate-bindings"
import { mergeUint8 } from "@polkadot-api/utils"
import { base64 } from "@scure/base"
import { verify as sr25519Verify } from "@scure/sr25519"
import { vrfVerify } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"
import { CUSTOM_SIGNED_EXTENSIONS, getPjsTxHelper } from "@talismn/sapi"
import { hexToU8a, u8aToHex } from "@talismn/util"
import { waitFor } from "@testing-library/dom"
import { v4 } from "uuid"
import { beforeAll, beforeEach, describe, expect, vi } from "vitest"
import { getMessageSenderFn } from "../../../tests/core/util"
import { db } from "../db"
import { passwordStore } from "../domains/app/store.password"
import { keyringStore } from "../domains/keyring/store"
import { signSubstrate, signVrf } from "../domains/signing/requests"
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
  isPhishingSite: async () => false,
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
    // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)

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

      const { parseMetadataRpc } = await import("@talismn/scale")
      signedExtensions = (
        parseMetadataRpc(metadataHex).unifiedMetadata.extrinsic.signedExtensions[0] ?? []
      ).map((e) => e.identifier)

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

      const requestPromise = signSubstrate(
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
  })

  describe("vrf signing", () => {
    beforeEach(async () => {
      requestStore.clearRequests()
    })

    const requestVrfSign = (payload: VrfSignPayload) =>
      tabs.handle(v4(), "pub(vrf.sign)", payload, {} as chrome.runtime.Port, DAPP_URL)

    const signVrfOnce = async (account: Account, data: `0x${string}`) => {
      const requestPromise = requestVrfSign({ address: account.address, data })

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
      // the VRF output is deterministic across signatures, the proof is not
      expect(sig1.slice(0, 66)).toBe(sig2.slice(0, 66))

      const addressInfo = getSs58AddressInfo(account.address)
      if (!addressInfo.isValid) throw new Error("Invalid address")
      const sigBytes = Buffer.from(sig1.slice(2), "hex")
      const msgBytes = Buffer.from(data.slice(2), "hex")
      // verifying through the Talisman namespace proves the handler applies the context prefix
      expect(vrfVerify(addressInfo.publicKey, msgBytes, sigBytes)).toBe(true)
    })

    test.each([
      ["invalid hex digits", "0xzz"],
      ["odd length", "0x1"],
      ["a missing 0x prefix", "1234"],
      ["an empty string", ""],
    ])("rejects data with %s", async (_, data) => {
      const account = await getAccount()

      await expect(requestVrfSign({ address: account.address, data })).rejects.toThrow(
        /Invalid data/
      )
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // an omitted context means "empty", an empty string is malformed - "0x" is how a caller
    // asks for empty bytes
    test("rejects an empty context string", async () => {
      const account = await getAccount()

      await expect(
        requestVrfSign({ address: account.address, data: "0x00", context: "" })
      ).rejects.toThrow(/Invalid context/)
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    test("rejects oversized data", async () => {
      const account = await getAccount()
      const data = `0x${"00".repeat(64 * 1024 + 1)}`

      await expect(requestVrfSign({ address: account.address, data })).rejects.toThrow(
        /Invalid data/
      )
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // the VRF needs the raw sr25519 secret key, so both predicates of the account check matter:
    // ethereum isolates the curve one, watch-only isolates the account type one
    test.each([
      ["a non-sr25519 keypair", "Test Ethereum Account"],
      ["a watch-only account", "Test Watch Only Account"],
    ])("rejects %s", async (_, name) => {
      const accounts = await keyringStore.getAccounts()
      const account = accounts.find((acc) => acc.name === name)
      expect(account).toBeDefined()
      if (!account) throw new Error("Account not found")

      await expect(requestVrfSign({ address: account.address, data: "0x00" })).rejects.toThrow(
        /VRF signing requires a local sr25519 account/
      )
      expect(requestStore.getCounts().get("vrf-sign")).toBe(0)
    })

    // the request store only drops a request through resolve/reject, so a failing approval must
    // reject it rather than throw and leave the dapp waiting. queued directly to get past the
    // account check `pub(vrf.sign)` does, and reach the handler's own curve assertion
    test("rejects the queued request when approval fails", async () => {
      const accounts = await keyringStore.getAccounts()
      const account = accounts.find((acc) => acc.name === "Test Ethereum Account")
      if (!account) throw new Error("Account not found")

      const requestPromise = signVrf(
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

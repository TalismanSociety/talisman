import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { getPjsTxHelper } from "@polkadot-api/tx-utils"
import { mergeUint8 } from "@polkadot-api/utils"
import { verify as sr25519Verify } from "@scure/sr25519"
import type { Account } from "@talismn/keyring"
import { waitFor } from "@testing-library/dom"
import { getSs58AddressInfo } from "polkadot-api"
import { beforeAll, beforeEach, describe, expect, vi } from "vitest"
import { getMessageSenderFn } from "../../../tests/core/util"
import { db } from "../db"
import { passwordStore } from "../domains/app/store.password"
import { keyringStore } from "../domains/keyring/store"
import { signSubstrate } from "../domains/signing/requests"
import { requestStore } from "../libs/requests/store"
import type { SignerPayloadJSON } from "../types/pjsInterop"
import Extension from "./Extension"
import { extensionStores } from "./stores"

vi.setConfig({ testTimeout: 10_000 })

describe("Extension", () => {
  let extension: Extension
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

    await extensionStores.sites.updateSite("localhost:3000", { addresses: [address] })
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
      const { callData, extra, additionalSigned } = getPjsTxHelper(metadataHex)(
        payload as Parameters<ReturnType<typeof getPjsTxHelper>>[0]
      )
      const signingInput = mergeUint8([callData, extra, additionalSigned])
      const sigBytes = Buffer.from(signature.slice(2), "hex")
      expect(sigBytes[0]).toBe(1) // MultiSignature type prefix: sr25519
      const addressInfo = getSs58AddressInfo(account.address)
      if (!addressInfo.isValid) throw new Error("Invalid address")
      expect(sr25519Verify(signingInput, sigBytes.subarray(1), addressInfo.publicKey)).toBe(true)
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

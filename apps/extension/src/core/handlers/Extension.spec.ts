import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import { db } from "@core/db"
import { passwordStore } from "@core/domains/app"
import { chaindataProvider } from "@core/rpcs/chaindata"
import RequestExtrinsicSign from "@polkadot/extension-base/background/RequestExtrinsicSign"
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ResponseSigning } from "@polkadot/extension-base/background/types"
import { AccountsStore } from "@polkadot/extension-base/stores"
import type { MetadataDef } from "@polkadot/extension-inject/types"
import type { KeyringPair } from "@polkadot/keyring/types"
import { TypeRegistry } from "@polkadot/types"
import type { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import type { SignerPayloadJSON } from "@polkadot/types/types"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import Browser from "webextension-polyfill"

import { getMessageSenderFn } from "../../../tests/util"
import Extension from "./Extension"
import State from "./State"
import { extensionStores } from "./stores"

jest.mock("@talismn/chaindata-provider-extension/src/graphql")
jest.setTimeout(10000)

// Mock the hasSpiritKey module to return false
jest.mock("@core/util/hasSpiritKey", () => {
  return {
    fetchHasSpiritKey: jest.fn().mockImplementation(async () => {
      return false
    }),
  }
})

describe("Extension", () => {
  let extension: Extension
  let state: State
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const suri = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd " // has a space

  async function createExtension(): Promise<Extension> {
    await cryptoWaitReady()

    keyring.loadAll({ store: new AccountsStore() })

    extensionStores.sites.set({
      "localhost:3000": {
        addresses: [],
        id: "11",
        origin: "example.com",
        url: "http://localhost:3000",
      },
    })
    state = new State()

    return new Extension(state, extensionStores)
  }

  const getAccount = async (): Promise<string> => {
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    expect(account).toBeDefined()

    if (!account) throw new Error("Account not found")
    return account.address
  }

  beforeAll(async () => {
    await Browser.storage.local.clear()
    extension = await createExtension()
    messageSender = getMessageSenderFn(extension)

    await messageSender("pri(app.onboard)", {
      pass: password,
      passConfirm: password,
    })
    const account = keyring.getAccounts().find(({ meta }) => meta.name === "My Polkadot Account")
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await extensionStores.sites.updateSite("localhost:3000", { addresses: [account!.address] })
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
    const pw = passwordStore.getPassword()
    expect(pw).toBeTruthy()

    const {
      pair: { address },
    } = keyring.addUri(suri, pw)

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

  describe("custom user extension tests", () => {
    let address: string, payload: SignerPayloadJSON, pair: KeyringPair

    beforeEach(async () => {
      state.requestStores.signing.clearRequests()
      // need to use the pw from the store, because it may need to be trimmed
      address = await getAccount()
      pair = keyring.getPair(address)
      const pw = await passwordStore.getPassword()
      pair.decodePkcs8(pw)
      payload = {
        address,
        blockHash: "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80",
        blockNumber: "0x00000393",
        era: "0x3601",
        genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
        method:
          "0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100",
        nonce: "0x0000000000000000",
        signedExtensions: [
          "CheckSpecVersion",
          "CheckTxVersion",
          "CheckGenesis",
          "CheckMortality",
          "CheckNonce",
          "CheckWeight",
          "ChargeTransactionPayment",
        ],
        specVersion: "0x00000026",
        tip: "0x00000000000000000000000000000000",
        transactionVersion: "0x00000005",
        version: 4,
      }
    })

    test("signs with default signed extensions", async () => {
      const registry = new TypeRegistry()

      registry.setSignedExtensions(payload.signedExtensions)

      const signatureExpected = registry
        .createType("ExtrinsicPayload", payload, { version: payload.version })
        .sign(pair)

      const requestPromise = state.requestStores.signing.sign(
        "http://test.com",
        new RequestExtrinsicSign(payload),
        {
          address,
          ...pair.meta,
        }
      )

      expect(state.requestStores.signing.getRequestCount()).toBe(1)

      const approveMessage = await messageSender("pri(signing.approveSign)", {
        id: state.requestStores.signing.allRequests[0].id,
      })

      expect(approveMessage).toEqual(true)

      // eslint-disable-next-line jest/valid-expect-in-promise
      return await requestPromise
        .then((result) =>
          // eslint-disable-next-line jest/no-conditional-expect
          expect((result as ResponseSigning)?.signature).toEqual(signatureExpected.signature)
        )
        .catch((err) => {
          throw err
        })
    })

    test("signs with user extensions, known types", async () => {
      const types = {} as unknown as Record<string, string>

      const userExtensions = {
        MyUserExtension: {
          extrinsic: {
            assetId: "AssetId",
          },
          payload: {},
        },
      } as unknown as ExtDef

      const meta: MetadataDef = {
        chain: "Development",
        color: "#191a2e",
        genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
        icon: "",
        specVersion: 38,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: "",
        types,
        userExtensions,
      }
      await db.metadata.put(meta)

      const payload: SignerPayloadJSON = {
        address,
        blockHash: "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80",
        blockNumber: "0x00000393",
        era: "0x3601",
        genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
        method:
          "0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100",
        nonce: "0x0000000000000000",
        signedExtensions: ["MyUserExtension"],
        specVersion: "0x00000026",
        tip: "0x00000000000000000000000000000000",
        transactionVersion: "0x00000005",
        version: 4,
      }

      const registry = new TypeRegistry()

      registry.setSignedExtensions(payload.signedExtensions, userExtensions)
      registry.register(types)

      const signatureExpected = registry
        .createType("ExtrinsicPayload", payload, { version: payload.version })
        .sign(pair)

      const requestPromise = state.requestStores.signing.sign(
        "http://test.com",
        new RequestExtrinsicSign(payload),
        {
          address,
          ...meta,
        }
      )

      expect(state.requestStores.signing.getRequestCount()).toBe(1)

      await expect(
        messageSender("pri(signing.approveSign)", {
          id: state.requestStores.signing.allRequests[0].id,
        })
      ).resolves.toEqual(true)

      // eslint-disable-next-line jest/valid-expect-in-promise
      return await requestPromise
        .then((result) => {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(result?.signature).toEqual(signatureExpected.signature)
        })
        .catch(console.log)
    })

    test("override default signed extension", async () => {
      const types = {
        FeeExchangeV1: {
          assetId: "Compact<AssetId>",
          maxPayment: "Compact<Balance>",
        },
        PaymentOptions: {
          feeExchange: "FeeExchangeV1",
          tip: "Compact<Balance>",
        },
      } as unknown as Record<string, string>

      const userExtensions = {
        ChargeTransactionPayment: {
          extrinsic: {
            transactionPayment: "PaymentOptions",
          },
          payload: {},
        },
      } as unknown as ExtDef

      const meta: MetadataDef = {
        chain: "Development",
        color: "#191a2e",
        genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
        icon: "",
        specVersion: 38,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: "",
        types,
        userExtensions,
      }

      await db.metadata.put(meta)

      const registry = new TypeRegistry()

      registry.setSignedExtensions(payload.signedExtensions, userExtensions)
      registry.register(types)

      const signatureExpected = registry
        .createType("ExtrinsicPayload", payload, { version: payload.version })
        .sign(pair)

      const requestPromise = state.requestStores.signing.sign(
        "http://test.com",
        new RequestExtrinsicSign(payload),
        {
          address,
          ...meta,
        }
      )

      expect(state.requestStores.signing.getRequestCount()).toBe(1)

      await expect(
        messageSender("pri(signing.approveSign)", {
          id: state.requestStores.signing.allRequests[0].id,
        })
      ).resolves.toEqual(true)

      // eslint-disable-next-line jest/valid-expect-in-promise
      return await requestPromise
        .then((result) => {
          // eslint-disable-next-line jest/no-conditional-expect
          expect((result as ResponseSigning)?.signature).toEqual(signatureExpected.signature)
        })
        .catch((err) => console.log(err))
    })

    test("signs with user extensions, additional types", async () => {
      const types = {
        myCustomType: {
          feeExchange: "Compact<AssetId>",
          tip: "Compact<Balance>",
        },
      } as unknown as Record<string, string>

      const userExtensions = {
        MyUserExtension: {
          extrinsic: {
            myCustomType: "myCustomType",
          },
          payload: {},
        },
      } as unknown as ExtDef

      const meta: MetadataDef = {
        chain: "Development",
        color: "#191a2e",
        genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
        icon: "",
        specVersion: 38,
        ss58Format: 0,
        tokenDecimals: 12,
        tokenSymbol: "",
        types,
        userExtensions,
      }

      await db.metadata.put(meta)

      const payload = {
        address,
        blockHash: "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80",
        blockNumber: "0x00000393",
        era: "0x3601",
        genesisHash: "0x242a54b35e1aad38f37b884eddeb71f6f9931b02fac27bf52dfb62ef754e5e62",
        method:
          "0x040105fa8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4882380100",
        nonce: "0x0000000000000000",
        signedExtensions: [
          "MyUserExtension",
          "CheckTxVersion",
          "CheckGenesis",
          "CheckMortality",
          "CheckNonce",
          "CheckWeight",
          "ChargeTransactionPayment",
        ],
        specVersion: "0x00000026",
        tip: null,
        transactionVersion: "0x00000005",
        version: 4,
      } as unknown as SignerPayloadJSON

      const registry = new TypeRegistry()

      registry.setSignedExtensions(payload.signedExtensions, userExtensions)
      registry.register(types)

      const signatureExpected = registry
        .createType("ExtrinsicPayload", payload, { version: payload.version })
        .sign(pair)

      const requestPromise = state.requestStores.signing.sign(
        "http://test.com",
        new RequestExtrinsicSign(payload),
        {
          address,
          ...meta,
        }
      )

      expect(state.requestStores.signing.getRequestCount()).toBe(1)

      await expect(
        messageSender("pri(signing.approveSign)", {
          id: state.requestStores.signing.allRequests[0].id,
        })
      ).resolves.toEqual(true)

      // eslint-disable-next-line jest/valid-expect-in-promise
      return await requestPromise
        .then((result) => {
          // eslint-disable-next-line jest/no-conditional-expect
          expect((result as ResponseSigning)?.signature).toEqual(signatureExpected.signature)
        })
        .catch((err) => console.log(err))
    })
  })

  test("hydrates chaindata when requested", async () => {
    // the un-hydrated chaindata provider should be empty
    expect((await chaindataProvider.chainIds()).length).toStrictEqual(0)
    expect((await chaindataProvider.evmNetworkIds()).length).toStrictEqual(0)
    expect((await chaindataProvider.tokenIds()).length).toStrictEqual(0)

    // submit the hydrate chaindata messages (usually sent by the popup/dashboard frontend to the backend)
    expect(
      await Promise.all([
        messageSender("pri(chains.subscribe)", null),
        messageSender("pri(eth.networks.subscribe)", null),
        messageSender("pri(tokens.subscribe)", null),
      ])
    ).toStrictEqual([true, true, true])

    // the hydrated chaindata provier should now have chains, evmNetworks and tokens!
    expect((await chaindataProvider.chainIds()).length).toBeGreaterThan(0)
    expect((await chaindataProvider.evmNetworkIds()).length).toBeGreaterThan(0)
    expect((await chaindataProvider.tokenIds()).length).toBeGreaterThan(0)
  })

  test("new accounts are added to authorised sites with connectAllSubstrate automatically", async () => {
    // app.talisman.xyz should already be in the authorised sites store after onboarding
    const existingAddress = await getAccount()
    const talismanSite = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(talismanSite && talismanSite.addresses)
    expect(talismanSite.addresses!.includes(existingAddress))

    const newAddress = await messageSender("pri(accounts.create)", {
      name: "AutoAdd",
      type: "sr25519",
    })

    const sites = await extensionStores.sites.get()
    const talismanSiteAgain = sites[TALISMAN_WEB_APP_DOMAIN]
    expect(talismanSiteAgain.addresses!.includes(newAddress))

    const otherSite = Object.values(sites).find((site) => !site.connectAllSubstrate)
    expect(otherSite)
    expect(otherSite!.addresses?.includes(newAddress)).toBeFalsy()
  })
})

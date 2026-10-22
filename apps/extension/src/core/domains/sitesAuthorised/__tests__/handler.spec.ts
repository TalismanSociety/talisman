import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"
import { getMessageSenderFn } from "../../../../../tests/core/util"
import Extension from "../../../handlers/Extension"
import { extensionStores } from "../../../handlers/stores"
import { keyringStore } from "../../keyring/store"
import type { AuthorizedSites } from "../types"

// the keyring KDF (PBKDF2, 100k iterations) runs for every secret and is tested in @talismn/crypto
vi.mock("@talismn/crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@talismn/crypto")>()
  return {
    ...actual,
    pbkdf2: ((hash, entropy, salt, _iterations, length) =>
      actual.pbkdf2(hash, entropy, salt, 1, length)) satisfies typeof actual.pbkdf2,
  }
})

describe("Sites Authorised Handler", () => {
  let handler: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const mnemonic = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd"
  let sitesStore: AuthorizedSites
  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    return new Extension(extensionStores)
  }

  afterAll(async () => {
    await chrome.storage.local.clear()
  })

  beforeAll(async () => {
    await chrome.storage.local.clear()

    handler = await createExtension()
    messageSender = getMessageSenderFn(handler)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password,
      passConfirm: password,
    })

    await messageSender("pri(accounts.add.derive)", [
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

    sitesStore = await extensionStores.sites.get()
  })

  beforeEach(async () => {
    await messageSender("pri(app.authenticate)", {
      pass: password,
    })
    // reset store for each test
    await extensionStores.sites.set(sitesStore)
  })

  test("updating a site's addresses turns off connectAllSubstrate", async () => {
    // create another address
    const [newAddress] = await messageSender("pri(accounts.add.derive)", [
      {
        type: "existing-mnemonic",
        mnemonicId,
        name: "TestAdd",
        curve: "sr25519",
        derivationPath: "//Other",
      },
    ])

    const webApp = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(webApp).toBeTruthy()
    // expect that it has connectAllSubstrate
    expect(webApp.connectAllSubstrate).toBeTruthy()

    // expect that the new account address is in the webApp accounts
    const webAppAddresses = webApp.addresses
    expect(webAppAddresses).toBeTruthy()
    expect(webAppAddresses!.includes(newAddress)).toBeTruthy()
    // update the addresses for that site
    await messageSender("pri(sites.update)", {
      id: TALISMAN_WEB_APP_DOMAIN,
      authorisedSite: {
        addresses: webAppAddresses!.filter((add) => add !== newAddress),
      },
    })

    const webAppAgain = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    // expect that connectAllSubstrate is undefined now for the web app
    expect(webAppAgain.connectAllSubstrate).toBeUndefined()
    // expect that the new adress is not one of the addresses
    expect(webAppAgain.addresses?.includes(newAddress)).toBeFalsy()
  })

  test("Forgetting a site with ethAddresses turns off connectAllSubstrate", async () => {
    // expect that the talisman web app is in the sites store
    const webApp = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(webApp).toBeDefined()
    // expect that it has connectAllSubstrate
    expect(webApp.connectAllSubstrate).toBeTruthy()

    const [ethAddress] = await messageSender("pri(accounts.add.derive)", [
      {
        type: "existing-mnemonic",
        name: "TestAddAEth",
        curve: "ethereum",
        mnemonicId,
        derivationPath: "m/44'/60'/0'/0/0",
      },
    ])

    await extensionStores.sites.updateSite(TALISMAN_WEB_APP_DOMAIN, {
      ethAddresses: [ethAddress],
    })

    // update the addresses for that site
    await messageSender("pri(sites.forget)", {
      id: TALISMAN_WEB_APP_DOMAIN,
      type: "polkadot",
    })

    // expect that connectAllSubstrate is undefined now for the web app
    const webAppAgain = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(webAppAgain).toBeDefined()
    expect(webAppAgain.connectAllSubstrate).toBeUndefined()
  })

  test("Forgetting a site with only substrate addresses deletes it", async () => {
    // expect that the talisman web app is in the sites store
    const webApp = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)

    expect(webApp).toBeDefined()
    expect(webApp.ethAddresses).toBeUndefined()

    // update the addresses for that site
    await messageSender("pri(sites.forget)", {
      id: TALISMAN_WEB_APP_DOMAIN,
      type: "polkadot",
    })

    // expect that the site is gone
    const webAppAgain = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(webAppAgain).toBeUndefined()
  })
})

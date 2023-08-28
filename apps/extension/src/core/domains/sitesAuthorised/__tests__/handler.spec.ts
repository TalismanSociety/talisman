/* eslint-disable @typescript-eslint/no-non-null-assertion */
// import Extension from "./Extension"
import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import Extension from "@core/handlers/Extension"
import { extensionStores } from "@core/handlers/stores"
/* eslint-disable no-console */
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import Browser from "webextension-polyfill"

import { getMessageSenderFn } from "../../../../../tests/util"
import { AuthorizedSites } from "../types"

keyring.loadAll({ store: new AccountsStore() })

describe("Sites Authorised Handler", () => {
  let handler: Extension
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const suri = "seed sock milk update focus rotate barely fade car face mechanic mercy"
  const password = "passw0rd"
  let sitesStore: AuthorizedSites
  let mnemonicId: string

  async function createExtension(): Promise<Extension> {
    await cryptoWaitReady()

    return new Extension(extensionStores)
  }

  afterAll(async () => {
    await Browser.storage.local.clear()
  })

  beforeAll(async () => {
    await Browser.storage.local.clear()

    handler = await createExtension()
    messageSender = getMessageSenderFn(handler)

    await messageSender("pri(app.onboardCreatePassword)", {
      pass: password,
      passConfirm: password,
    })
    await messageSender("pri(accounts.create)", {
      name: "Test Polkadot Account",
      type: "sr25519",
      mnemonic: suri,
      confirmed: false,
    })

    mnemonicId = Object.keys(await extensionStores.seedPhrase.get())[0]

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
    const newAddress = await messageSender("pri(accounts.create)", {
      name: "TestAdd",
      type: "sr25519",
      mnemonicId,
    })

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
    expect(webApp)
    // expect that it has connectAllSubstrate
    expect(webApp.connectAllSubstrate).toBeTruthy()

    const ethAddress = await messageSender("pri(accounts.create)", {
      name: "TestAddAEth",
      type: "ethereum",
      mnemonicId,
    })

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
    expect(webAppAgain)
    expect(webAppAgain.connectAllSubstrate).toBeUndefined()
  })

  test("Forgetting a site with only substrate addresses deletes it", async () => {
    // expect that the talisman web app is in the sites store
    const webApp = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)

    expect(webApp)
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

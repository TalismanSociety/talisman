/* eslint-disable @typescript-eslint/no-non-null-assertion */
// import Extension from "./Extension"
import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import Extension from "@core/handlers/Extension"
import State from "@core/handlers/State"
import { extensionStores } from "@core/handlers/stores"
/* eslint-disable no-console */
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import Browser from "webextension-polyfill"

import { getMessageSenderFn } from "../../../../../tests/util"
import { AuthorizedSites } from "../types"

jest.mock("@talismn/chaindata-provider-extension/dist/graphql")
jest.setTimeout(20000)

keyring.loadAll({ store: new AccountsStore() })

describe("Sites Authorised Handler", () => {
  let handler: Extension
  let state: State
  let messageSender: ReturnType<typeof getMessageSenderFn>
  const password = "passw0rd"
  let sitesStore: AuthorizedSites

  async function createExtension(): Promise<Extension> {
    await cryptoWaitReady()

    state = new State()
    return new Extension(state, extensionStores)
  }

  afterAll(async () => {
    await Browser.storage.local.clear()
  })

  beforeAll(async () => {
    await Browser.storage.local.clear()

    handler = await createExtension()
    messageSender = getMessageSenderFn(handler)

    await messageSender("pri(app.onboard)", {
      pass: password,
      passConfirm: password,
    })
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
    })

    // expect that the talisman web app is in the sites store
    const webApp = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)
    expect(webApp)
    // expect that it has connectAllSubstrate
    expect(webApp.connectAllSubstrate).toBeTruthy()

    // expect that the new account address is in the webApp accounts
    const webAppAddresses = webApp.addresses
    expect(webAppAddresses?.includes(newAddress)).toBeTruthy()

    // update the addresses for that site
    await messageSender("pri(sites.update)", {
      id: TALISMAN_WEB_APP_DOMAIN,
      authorisedSite: {
        addresses: webAppAddresses!.filter((add) => add !== newAddress),
      },
    })

    // expect that connectAllSubstrate is undefined now for the web app
    const webAppAgain = await extensionStores.sites.get(TALISMAN_WEB_APP_DOMAIN)

    expect(webAppAgain.connectAllSubstrate).toBeUndefined()
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

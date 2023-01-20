import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import { watCryptoWaitReady } from "@talismn/scale"
import { DEBUG, PORT_CONTENT, PORT_EXTENSION } from "extension-shared"

import { initSentry } from "./config/sentry"
import { passwordStore } from "./domains/app/store.password"
import talismanHandler from "./handlers"
import { IconManager } from "./libs/IconManager"
import { MigrationRunner, migrations } from "./libs/migrations"
import { migrateConnectAllSubstrate } from "./libs/migrations/legacyMigrations"

initSentry(Sentry)

// eslint-disable-next-line no-void
void chrome.action.setBadgeBackgroundColor({ color: "#d90000" })

// Onboarding and migrations
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  if (reason === "install") {
    // if install, we want to check the storage for prev onboarded info
    // if not onboarded, show the onboard screen
    chrome.storage.local.get(["talismanOnboarded", "app"]).then((data) => {
      // open onboarding when reason === "install" and data?.talismanOnboarded !== true
      // open dashboard data?.talismanOnboarded === true
      const legacyOnboarded =
        data && data.talismanOnboarded && data.talismanOnboarded?.onboarded === "TRUE"
      const currentOnboarded = data && data.app && data.app.onboarded === "TRUE"
      if (!legacyOnboarded && !currentOnboarded) {
        chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") })
      }
    })

    // instantiate the migrations runner with applyFake = true
    // this will not run any migrations
    const migrationRunner = new MigrationRunner(migrations, true)
    await migrationRunner.isComplete
  } else if (reason === "update") {
    // run any legacy migrations
    if (previousVersion) {
      await migrateConnectAllSubstrate(previousVersion)
    }
  }
})

// run migrations on first login after startup
// Migrations occur on login to ensure that password is present for any migrations that require it
const migrationSub = passwordStore.isLoggedIn.subscribe(async (isLoggedIn) => {
  if (isLoggedIn === "TRUE") {
    const password = await passwordStore.getPassword()
    if (!password) {
      Sentry.captureMessage("Unabe to run migrations, no password present")
      return
    }
    // instantiate the migrations runner with migrations to run
    // this will run any migrations that have not already been run
    const migrationRunner = new MigrationRunner(migrations, false, {
      password,
    })

    await migrationRunner.isComplete
    // only do this once
    migrationSub.unsubscribe()
  }
})

// listen to all messages and handle appropriately
chrome.runtime.onConnect.addListener((_port): void => {
  // only listen to what we know about
  assert(
    [PORT_CONTENT, PORT_EXTENSION].includes(_port.name),
    `Unknown connection from ${_port.name}`
  )
  let port: chrome.runtime.Port | undefined = _port

  port.onDisconnect.addListener(() => {
    port = undefined
  })

  port.onMessage.addListener((data) => {
    if (port) talismanHandler(data, port)
  })
})

!DEBUG && chrome.runtime.setUninstallURL("https://goto.talisman.xyz/uninstall")

// initial setup
Promise.all([
  // wait for `@polkadot/util-crypto` to be ready (it needs to load some wasm)
  cryptoWaitReady(),
  // wait for `@talismn/scale` to be ready (it needs to load some wasm)
  watCryptoWaitReady(),
])
  .then((): void => {
    // load all the keyring data
    keyring.loadAll({
      store: new AccountsStore(),
      type: "sr25519",
      filter: (json) => {
        return typeof json?.address === "string"
      },
    })
  })
  .catch(Sentry.captureException)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const iconManager = new IconManager()

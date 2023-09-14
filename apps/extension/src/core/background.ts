import "@core/util/enableLogsInDevelopment"

import { initSentry } from "@core/config/sentry"
import { DEBUG, PORT_CONTENT, PORT_EXTENSION } from "@core/constants"
import { MigrationRunner, migrations } from "@core/libs/migrations"
import { consoleOverride } from "@core/util/logging"
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import Browser, { Runtime } from "webextension-polyfill"

import { passwordStore } from "./domains/app"
import talismanHandler from "./handlers"
import { IconManager } from "./libs/IconManager"
import { migrateConnectAllSubstrate } from "./libs/migrations/legacyMigrations"

initSentry(Sentry)
consoleOverride(DEBUG)

// eslint-disable-next-line no-void
void Browser.browserAction.setBadgeBackgroundColor({ color: "#d90000" })

// Onboarding and migrations
Browser.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  if (reason === "install") {
    // if install, we want to check the storage for prev onboarded info
    // if not onboarded, show the onboard screen
    Browser.storage.local.get(["talismanOnboarded", "app"]).then((data) => {
      // open onboarding when reason === "install" and data?.talismanOnboarded !== true
      // open dashboard data?.talismanOnboarded === true
      const legacyOnboarded =
        data && data.talismanOnboarded && data.talismanOnboarded?.onboarded === "TRUE"
      const currentOnboarded = data && data.app && data.app.onboarded === "TRUE"
      if (!legacyOnboarded && !currentOnboarded) {
        Browser.tabs.create({ url: Browser.runtime.getURL("onboarding.html") })
      }
    })

    // instantiate the migrations runner with applyFake = true
    // this will not run any migrations
    const migrationRunner = new MigrationRunner(migrations, true)
    await migrationRunner.isComplete
  } else if (reason === "update") {
    // Main migrations will occur on login to ensure that password is present for any migrations that require it
    passwordStore.isLoggedIn.subscribe(async (isLoggedIn) => {
      if (isLoggedIn) {
        const password = passwordStore.getPassword()
        if (!password) return
        // instantiate the migrations runner with migrations to run
        // this will run any migrations that have not already been run
        const migrationRunner = new MigrationRunner(migrations, false, {
          password,
        })
        await migrationRunner.isComplete
      }
    })
    // run any legacy migrations
    if (previousVersion) {
      await migrateConnectAllSubstrate(previousVersion)
    }
  }
})

// listen to all messages and handle appropriately
Browser.runtime.onConnect.addListener((_port): void => {
  // only listen to what we know about
  assert(
    [PORT_CONTENT, PORT_EXTENSION].includes(_port.name),
    `Unknown connection from ${_port.name}`
  )
  let port: Runtime.Port | undefined = _port

  port.onDisconnect.addListener(() => {
    port = undefined
  })

  port.onMessage.addListener((data) => {
    if (port) talismanHandler(data, port)
  })
})

!DEBUG && Browser.runtime.setUninstallURL("https://goto.talisman.xyz/uninstall")

// initial setup
cryptoWaitReady()
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

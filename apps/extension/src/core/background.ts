import "@core/util/enableLogsInDevelopment"

import { initSentry } from "@core/config/sentry"
import { DEBUG, PORT_CONTENT, PORT_EXTENSION } from "@core/constants"
import { MigrationStore, migrations } from "@core/domains/app/migrations"
import { consoleOverride } from "@core/util/logging"
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import Browser, { Runtime } from "webextension-polyfill"

import {
  migrateConnectAllSubstrate,
  migratePolkadotVaultVerifierCertificate,
} from "./domains/app/migrations/legacyMigrations"
import talismanHandler from "./handlers"
import { IconManager } from "./libs/IconManager"

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

    // instantiate the migrations store with applyFake = true
    // this will not run any migrations
    const migrationStore = new MigrationStore(migrations, true)
    await migrationStore.isComplete
  } else if (reason === "update") {
    // instantiate the migrations store with migrations to run
    // this will run any migrations that have not already been run
    const migrationStore = new MigrationStore(migrations)
    await migrationStore.isComplete
    // run any legacy migrations
    if (previousVersion) {
      await migrateConnectAllSubstrate(previousVersion)
      await migratePolkadotVaultVerifierCertificate(previousVersion)
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

Browser.runtime.setUninstallURL("https://goto.talisman.xyz/uninstall")

// initial setup
cryptoWaitReady()
  .then((): void => {
    // load all the keyring data
    keyring.loadAll({
      store: new AccountsStore(),
      type: "sr25519",
      filter: (json) => {
        if (typeof json?.address !== "string") return false

        // delete genesisHash on load for old json-imported accounts
        if (json.meta?.origin === "JSON" && json.meta.genesisHash) delete json.meta.genesisHash

        return true
      },
    })
  })
  .catch(Sentry.captureException)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const iconManager = new IconManager()

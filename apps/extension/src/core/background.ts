import { DEBUG, PORT_CONTENT, PORT_EXTENSION } from "@common/constants"
import { log } from "@common/log"
import { assert } from "@talismn/util"

import { sentry } from "./config/sentry"
import { passwordStore } from "./domains/app/store.password"
import { remoteConfigStore } from "./domains/app/store.remoteConfig"
import { sessionStore } from "./domains/app/store.session"
import { assetDiscoveryScanner } from "./domains/assetDiscovery/scanner"
import { initialiseSolanaAssetDiscovery } from "./domains/assetDiscovery/solana"
import { initialiseSubstrateAssetDiscovery } from "./domains/assetDiscovery/substrate"
import talismanHandler from "./handlers"
import { IconManager } from "./libs/IconManager"
import { setWalletReady } from "./libs/isWalletReady"
import { MigrationRunner, migrations } from "./libs/migrations"
import { migrateConnectAllSubstrate } from "./libs/migrations/legacyMigrations"

sentry.init("background")

// the manual client excludes Sentry's GlobalHandlers integration (it relies on global state),
// so capture uncaught errors and unhandled rejections with our own listeners.
// mechanism hints mirror GlobalHandlers so these are reported as unhandled crashes
self.addEventListener("error", (event) => {
  sentry.captureException(event.error ?? event.message, {
    mechanism: { handled: false, type: "onerror" },
  })
})
self.addEventListener("unhandledrejection", (event) => {
  sentry.captureException(event.reason, {
    mechanism: { handled: false, type: "onunhandledrejection" },
  })
})

// Use chrome.action (MV3) or chrome.browserAction (MV2) for badge
const actionApi = chrome.action ?? chrome.browserAction
actionApi?.setBadgeBackgroundColor?.({ color: "#d90000" })

// Onboarding and migrations
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  // on install or upgrade, reset remote config to build-time defaults
  if (["install", "update"].includes(reason)) await remoteConfigStore.reset()

  if (reason === "install") {
    // if install, we want to check the storage for prev onboarded info
    // if not onboarded, show the onboard screen
    chrome.storage.local.get(["talismanOnboarded", "app"]).then((data) => {
      // open onboarding when reason === "install" and data?.talismanOnboarded !== true
      // open dashboard data?.talismanOnboarded === true
      const legacyOnboarded =
        data?.talismanOnboarded && data.talismanOnboarded?.onboarded === "TRUE"
      const currentOnboarded = data?.app && data.app.onboarded === "TRUE"
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
      sentry.captureMessage("Unable to run migrations, no password present")
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

    setWalletReady() // set the wallet ready state to true, so workers such as asset discovery can start

    // start the asset discovery scanner after migrations are complete
    assetDiscoveryScanner.startPendingScan()
    initialiseSolanaAssetDiscovery()
    initialiseSubstrateAssetDiscovery()
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "wakeup") {
    sendResponse({ status: "awake" })
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

  // biome-ignore lint/suspicious/noExplicitAny: it is literally anything
  const messageHandler = (data: any) => {
    if (port) talismanHandler(data, port)
  }
  port.onMessage.addListener(messageHandler)

  const disconnectHandler = () => {
    port?.onMessage.removeListener(messageHandler)
    port?.onDisconnect.removeListener(disconnectHandler)
    port = undefined
  }
  port.onDisconnect.addListener(disconnectHandler)
})

!DEBUG && chrome.runtime.setUninstallURL("https://thxbye.talisman.xyz/")

const _iconManager = new IconManager()

sessionStore.reset().catch((err) => {
  log.error("Failed to reset session store", err)
})

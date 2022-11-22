// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Runs in the extension background, handling all keyring access
// Adapted from https://github.com/polkadot-js/extension/packages/extension/src/background.ts

import "@core/util/enableLogsInDevelopment"

import { initSentry } from "@core/config/sentry"
import { DEBUG, PORT_CONTENT, PORT_EXTENSION } from "@core/constants"
import { consoleOverride } from "@core/util/logging"
import { AccountsStore } from "@polkadot/extension-base/stores"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { cryptoWaitReady } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import Browser, { Runtime } from "webextension-polyfill"

import talismanHandler from "./handlers"

initSentry(Sentry)
consoleOverride(DEBUG)

// eslint-disable-next-line no-void
void Browser.browserAction.setBadgeBackgroundColor({ color: "#d90000" })

// check the installed reason
// if install, we want to check the storage for prev onboarded info
// if not onboarded, show the onboard screen
Browser.runtime.onInstalled.addListener(({ reason }) => {
  Browser.storage.local.get(["talismanOnboarded", "app"]).then((data) => {
    // open onboarding when reason === "install" and data?.talismanOnboarded !== true
    // open dashboard data?.talismanOnboarded === true
    const legacyOnboarded =
      data && data.talismanOnboarded && data.talismanOnboarded?.onboarded === "TRUE"
    const currentOnboarded = data && data.app && data.app.onboarded === "TRUE"
    if (!legacyOnboarded && !currentOnboarded && reason === "install") {
      Browser.tabs.create({ url: Browser.runtime.getURL("onboarding.html") })
    }
  })
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

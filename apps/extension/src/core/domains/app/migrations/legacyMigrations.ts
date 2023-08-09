import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import { hasQrCodeAccounts } from "@core/domains/accounts/helpers"
import seedPhraseStore from "@core/domains/accounts/store"
import { verifierCertificateMnemonicStore } from "@core/domains/accounts/store.verifierCertificateMnemonic"
import passwordStore from "@core/domains/app/store.password"
import sitesAuthorisedStore from "@core/domains/sitesAuthorised/store"
import { lt } from "semver"
import Browser from "webextension-polyfill"

import { changePassword } from "../helpers"

export const migrateConnectAllSubstrate = async (previousVersion: string) => {
  if (!lt(previousVersion, "1.14.0")) return
  // once off migration to add `connectAllSubstrate` to the record for the Talisman Web App
  const site = await sitesAuthorisedStore.get(TALISMAN_WEB_APP_DOMAIN)
  if (!site) {
    const localData = await Browser.storage.local.get()
    const addresses = Object.entries(localData)
      .filter(([key]) => key.startsWith("account:0x"))
      .map(([, value]: [string, { address: string }]) => value.address)

    sitesAuthorisedStore.set({
      [TALISMAN_WEB_APP_DOMAIN]: {
        addresses,
        connectAllSubstrate: true,
        id: TALISMAN_WEB_APP_DOMAIN,
        origin: "Talisman",
        url: `https://${TALISMAN_WEB_APP_DOMAIN}`,
      },
    })
  }
}

export const migratePolkadotVaultVerifierCertificate = async (previousVersion: string) => {
  if (!lt(previousVersion, "1.17.0")) return
  // once off migration to add a Polkadot Vault verifier certificate seed store
  const hasVaultAccounts = await hasQrCodeAccounts()
  if (hasVaultAccounts) {
    // add a vault verifier certificate if any of the addresses are from a vault
    //first check if any of the addresses are from a vault
    // check if a vault verifier certificate store already exists
    const verifierCertMnemonicCipher = await verifierCertificateMnemonicStore.get("cipher")
    const seedPhraseData = await seedPhraseStore.get()
    if (!verifierCertMnemonicCipher && seedPhraseData.cipher) {
      // if not, create one
      await verifierCertificateMnemonicStore.set(seedPhraseData)
    }
  }
}

export const migratePasswordV1ToV2 = async (plaintextPw: string) => {
  const {
    salt,
    password: hashedPw,
    check,
    secret,
  } = await passwordStore.createPassword(plaintextPw)
  const { ok, val } = await changePassword({ currentPw: plaintextPw, newPw: hashedPw })
  if (ok) {
    // success
    await passwordStore.set({ isHashed: true, salt, check, secret })
    passwordStore.setPassword(hashedPw)
    return true
  }
  throw new Error(val)
}

export const migratePasswordV2ToV1 = async (plaintextPw: string) => {
  const hashedPw = await passwordStore.getHashedPassword(plaintextPw)
  const { ok, val } = await changePassword({ currentPw: hashedPw, newPw: plaintextPw })
  if (ok) {
    // success
    await passwordStore.set({ salt: undefined, isTrimmed: false, isHashed: false })
    passwordStore.setPassword(plaintextPw)
    return true
  }
  throw new Error(val)
}

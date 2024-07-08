import { TALISMAN_WEB_APP_DOMAIN } from "extension-shared"
import { lt } from "semver"

import { hasQrCodeAccounts } from "../../domains/accounts/helpers"
import { changePassword } from "../../domains/app/helpers"
import { passwordStore } from "../../domains/app/store.password"
import { createLegacyVerifierCertificateMnemonicStore } from "../../domains/mnemonics/legacy/store"
import { mnemonicsStore } from "../../domains/mnemonics/store"
import sitesAuthorisedStore from "../../domains/sitesAuthorised/store"

export const migrateConnectAllSubstrate = async (previousVersion: string) => {
  if (!lt(previousVersion, "1.14.0")) return
  // once off migration to add `connectAllSubstrate` to the record for the Talisman Web App
  const site = await sitesAuthorisedStore.get(TALISMAN_WEB_APP_DOMAIN)
  if (!site) {
    const localData = await chrome.storage.local.get()
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
    const verifierCertificateMnemonicStore = createLegacyVerifierCertificateMnemonicStore()
    const verifierCertMnemonicCipher = await verifierCertificateMnemonicStore.get("cipher")
    const mnemonicsData = await mnemonicsStore.get()
    if (!verifierCertMnemonicCipher && mnemonicsData.cipher) {
      // if not, create one
      await verifierCertificateMnemonicStore.set(mnemonicsData)
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

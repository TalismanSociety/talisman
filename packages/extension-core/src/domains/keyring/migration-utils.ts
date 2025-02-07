import { KeypairType } from "@polkadot/util-crypto/types"
import { KeypairCurve } from "@talismn/crypto"
import { Account, AccountType } from "@talismn/keyring"

import { AccountJsonAny, AccountType as LegacyAccountType } from "../accounts/types"

/**
 * Helper supposed to be deleted once codebase is migrated to new keyring
 * @param curve
 * @returns
 */
const accountCurveToLegacyType = (curve: KeypairCurve): KeypairType => {
  switch (curve) {
    case "ed25519":
    case "sr25519":
    case "ecdsa":
    case "ethereum":
      return curve
    default:
      throw new Error("Unsupported curve")
  }
}

/**
 * Helper supposed to be deleted once codebase is migrated to new keyring
 * @param curve
 * @returns
 */
export const legacyKeypairTypeToCurve = (type: KeypairType): KeypairCurve => {
  switch (type) {
    case "ed25519":
    case "sr25519":
    case "ecdsa":
    case "ethereum":
      return type
  }
}

/**
 * Helper supposed to be deleted once codebase is migrated to new keyring
 * @param type
 * @returns
 */
const accountTypeToLegacyOrigin = (type: AccountType): LegacyAccountType => {
  switch (type) {
    case "keypair":
      return LegacyAccountType.Talisman
    case "ledger-ethereum":
    case "ledger-polkadot":
      return LegacyAccountType.Ledger
    case "polkadot-vault":
      return LegacyAccountType.Qr
    case "watch-only":
      return LegacyAccountType.Watched
    default:
      throw new Error("Unsupported account type")
  }
}

/**
 * Helper supposed to be deleted once codebase is migrated to new keyring
 * @param account
 * @returns
 */
export const accountToLegacyJson = (account: Account): AccountJsonAny => {
  const origin = accountTypeToLegacyOrigin(account.type)

  switch (account.type) {
    case "keypair": {
      const { address, name, createdAt, mnemonicId, derivationPath } = account
      const type = accountCurveToLegacyType(account.curve)
      const whenCreated = createdAt
      return {
        name,
        address,
        type,
        origin,
        whenCreated,
        meta: {
          isExternal: false,
          isHardware: false,
          whenCreated,
          name,
          derivationPath,
          origin: "talisman",
          mnemonicId,
        },
      }
    }
    case "ledger-ethereum": {
      const { address, name, createdAt, derivationPath } = account
      const whenCreated = createdAt
      const type = "ethereum"
      return {
        name,
        address,
        type,
        whenCreated,
        derivationPath,
        isQr: false,
        isExternal: false,
        isHardware: true,
        meta: {
          isQr: false,
          isExternal: false,
          isHardware: true,
          whenCreated,
          name,
          origin: "ledger",
          path: derivationPath,
        },
      }
    }
    case "ledger-polkadot": {
      const { address, name, createdAt, accountIndex, addressOffset, app, genesisHash } = account
      const whenCreated = createdAt
      const type = "ed25519"
      return {
        name,
        address,
        type,
        whenCreated,
        isQr: false,
        isExternal: false,
        isHardware: true,
        meta: {
          isQr: false,
          isExternal: false,
          isHardware: true,
          whenCreated,
          name,
          origin: "ledger",
          accountIndex,
          addressOffset,
          app,
          genesisHash,
        },
      }
    }
    case "polkadot-vault": {
      const { address, name, createdAt, genesisHash } = account
      const whenCreated = createdAt
      const type = "sr25519"
      return {
        isQr: true,
        isExternal: false,
        isHardware: false,
        name,
        address,
        type,
        whenCreated,
        meta: {
          isExternal: false,
          isHardware: true,
          whenCreated,
          name,
          origin: "sr25519",
          genesisHash,
        },
      }
    }
    case "watch-only": {
      const { address, name, createdAt, isPortfolio } = account
      const whenCreated = createdAt
      return {
        name,
        address,
        type: "sr25519",
        whenCreated,
        isQr: false,
        isExternal: false,
        isHardware: false,
        meta: {
          isQr: false,
          isExternal: false,
          isHardware: false,
          whenCreated,
          name,
          origin: "watch-only",
          isPortfolio,
        },
      }
    }
    default:
      throw new Error("Unsupported account type")
  }
}

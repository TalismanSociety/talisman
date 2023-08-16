import type { RequestAccountsCatalogAction, Trees } from "@core/domains/accounts/helpers.catalog"
import { Address } from "@core/types/base"
import type {
  AccountJson,
  RequestAccountCreateExternal,
  RequestAccountCreateHardware,
  RequestAccountSubscribe,
  ResponseAccountExport,
} from "@polkadot/extension-base/background/types"
import { KeyringPair$Json } from "@polkadot/keyring/types"

export type {
  ResponseAccountExport,
  RequestAccountCreateHardware,
  AccountJson,
  RequestAccountCreateExternal,
}
export type { RequestAccountsCatalogAction } from "@core/domains/accounts/helpers.catalog"

export type {
  RequestAccountList,
  RequestAccountBatchExport,
  RequestAccountChangePassword,
  RequestAccountCreateSuri,
  RequestAccountEdit,
  RequestAccountShow,
  RequestAccountTie,
  RequestAccountValidate,
  ResponseJsonGetAccountInfo,
} from "@polkadot/extension-base/background/types"

// account types ----------------------------------

type AccountJsonHardwareSubstrateOwnProperties = {
  isHardware: true
  accountIndex: number
  addressOffset: number
}

export type AccountJsonHardwareSubstrate = AccountJson & AccountJsonHardwareSubstrateOwnProperties

type AccountJsonHardwareEthereumOwnProperties = {
  isHardware: true
  path: string
}

export type AccountJsonHardwareEthereum = AccountJson & AccountJsonHardwareEthereumOwnProperties

type AccountJsonQrOwnProperties = {
  isQr: true
}

export type AccountJsonQr = AccountJson & AccountJsonQrOwnProperties

type AccountJsonWatchedOwnProperties = {
  isPortfolio: boolean
}

export type AccountJsonWatched = AccountJson & AccountJsonWatchedOwnProperties

export type AccountJsonAny = (
  | AccountJsonHardwareEthereum
  | AccountJsonHardwareSubstrate
  | AccountJsonQr
  | AccountJsonWatched
  | AccountJson
) & { origin?: AccountType | undefined } & {
  folderId?: string
  folderName?: string
  sortOrder?: number
}

export type IdenticonType = "talisman-orb" | "polkadot-identicon"

export type AccountType = {
  [K in keyof typeof AccountTypes]: (typeof AccountTypes)[K]
}[keyof typeof AccountTypes]

export const AccountTypes = {
  TALISMAN: "TALISMAN", // mnemonic generated by Talisman
  LEGACY_ROOT: "ROOT", // legacy, deprecated
  DERIVED: "DERIVED",
  SEED: "SEED", // used for an imported mnemonic used to generate accounts but not stored
  SEED_STORED: "SEED_STORED", // used for an imported mnemonic which is stored
  JSON: "JSON",
  QR: "QR",
  HARDWARE: "HARDWARE",
  WATCHED: "WATCHED",
} as const

export const storedSeedAccountTypes: AccountType[] = [
  AccountTypes.TALISMAN,
  AccountTypes.LEGACY_ROOT,
  AccountTypes.SEED_STORED,
]

export type StoreSeedAccountTypes =
  | (typeof AccountTypes)["TALISMAN"]
  | (typeof AccountTypes)["LEGACY_ROOT"]
  | (typeof AccountTypes)["SEED_STORED"]

export interface AccountMeta extends AccountJson {
  name: string
  origin: AccountType
}

export interface Account {
  address: Address
  meta: AccountMeta
}

export type AccountsList = Account[]

export type AccountAddressType = "sr25519" | "ethereum"

export interface RequestAccountCreateFromSeed {
  name: string
  seed: string
  type?: AccountAddressType
}

export interface RequestAccountCreateFromJson {
  unlockedPairs: KeyringPair$Json[]
}

export interface RequestAccountCreateHardwareEthereum {
  name: string
  address: string
  path: string
}

export interface RequestAccountCreateWatched {
  name: string
  address: string
  isPortfolio: boolean
}

export interface RequestAccountExternalSetIsPortfolio {
  address: string
  isPortfolio: boolean
}

export interface RequestAccountForget {
  address: string
}

export interface RequestAccountExport {
  address: string
  password: string
  exportPw: string
}

export interface RequestAccountExportPrivateKey {
  address: string
  password: string
}

export interface RequestAccountRename {
  address: string
  name: string
}
export interface RequestAccountCreate {
  name: string
  type: AccountAddressType
  mnemonicId?: string
}

export type VerifierCertificateType = "new" | "talisman"

export type RequestSetVerifierCertificateMnemonic = {
  type: VerifierCertificateType
  mnemonic?: string
  mnemonicId?: string
}

export interface AccountsMessages {
  // account message signatures
  "pri(accounts.create)": [RequestAccountCreate, string]
  "pri(accounts.create.seed)": [RequestAccountCreateFromSeed, string]
  "pri(accounts.create.json)": [RequestAccountCreateFromJson, string[]]
  "pri(accounts.create.hardware.substrate)": [
    Omit<RequestAccountCreateHardware, "hardwareType">,
    string
  ]
  "pri(accounts.create.hardware.ethereum)": [RequestAccountCreateHardwareEthereum, string]
  "pri(accounts.create.qr.substrate)": [RequestAccountCreateExternal, string]
  "pri(accounts.create.watched)": [RequestAccountCreateWatched, string]
  "pri(accounts.forget)": [RequestAccountForget, boolean]
  "pri(accounts.export)": [RequestAccountExport, ResponseAccountExport]
  "pri(accounts.export.pk)": [RequestAccountExportPrivateKey, string]
  "pri(accounts.rename)": [RequestAccountRename, boolean]
  "pri(accounts.external.setIsPortfolio)": [RequestAccountExternalSetIsPortfolio, boolean]
  "pri(accounts.subscribe)": [RequestAccountSubscribe, boolean, AccountJson[]]
  "pri(accounts.catalog.subscribe)": [null, boolean, Trees]
  "pri(accounts.catalog.runActions)": [RequestAccountsCatalogAction[], boolean]
  "pri(accounts.validateMnemonic)": [string, boolean]
  "pri(accounts.setVerifierCertMnemonic)": [RequestSetVerifierCertificateMnemonic, boolean]
}

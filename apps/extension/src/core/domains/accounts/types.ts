import { Address } from "@core/types/base"
import type {
  AccountJson,
  RequestAccountCreateHardware,
  RequestAccountSubscribe,
  ResponseAccountExport,
} from "@polkadot/extension-base/background/types"

export type { ResponseAccountExport, RequestAccountCreateHardware, AccountJson }

export type {
  RequestAccountList,
  RequestAccountBatchExport,
  RequestAccountChangePassword,
  RequestAccountCreateExternal,
  RequestAccountCreateSuri,
  RequestAccountEdit,
  RequestAccountShow,
  RequestAccountTie,
  RequestAccountValidate,
  ResponseJsonGetAccountInfo,
} from "@polkadot/extension-base/background/types"

// account types ----------------------------------

export interface AccountJsonHardwareSubstrate extends AccountJson {
  isHardware: true
  accountIndex: number
  addressOffset: number
  genesisHash: string
}

export interface AccountJsonHardwareEthereum extends AccountJson {
  isHardware: true
  path: string
}

export interface AccountJsonQr extends AccountJson {
  isQr: true
}

export type AccountJsonAny = (
  | AccountJsonHardwareEthereum
  | AccountJsonHardwareSubstrate
  | AccountJsonQr
  | AccountJson
) & { origin?: keyof typeof AccountTypes | undefined }

export type IdenticonType = "talisman-orb" | "polkadot-identicon"

export const AccountTypes = {
  ROOT: "ROOT",
  DERIVED: "DERIVED",
  SEED: "SEED",
  JSON: "JSON",
  QR: "QR",
  HARDWARE: "HARDWARE",
}

export interface AccountMeta extends AccountJson {
  name: string
  origin: keyof typeof AccountTypes
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
  json: string
  password: string
}

export interface RequestAccountCreateHardwareEthereum {
  name: string
  address: string
  path: string
}

export interface RequestAccountCreateQr {
  name: string
  address: string
  genesisHash: string | null
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
}

export interface AccountsMessages {
  // account message signatures
  "pri(accounts.create)": [RequestAccountCreate, string]
  "pri(accounts.create.seed)": [RequestAccountCreateFromSeed, string]
  "pri(accounts.create.json)": [RequestAccountCreateFromJson, string]
  "pri(accounts.create.hardware.substrate)": [
    Omit<RequestAccountCreateHardware, "hardwareType">,
    string
  ]
  "pri(accounts.create.hardware.ethereum)": [RequestAccountCreateHardwareEthereum, string]
  "pri(accounts.create.qr.substrate)": [RequestAccountCreateQr, string]
  "pri(accounts.forget)": [RequestAccountForget, boolean]
  "pri(accounts.export)": [RequestAccountExport, ResponseAccountExport]
  "pri(accounts.export.pk)": [RequestAccountExportPrivateKey, string]
  "pri(accounts.rename)": [RequestAccountRename, boolean]
  "pri(accounts.subscribe)": [RequestAccountSubscribe, boolean, AccountJson[]]
  "pri(accounts.validateMnemonic)": [string, boolean]
}

// Mnemonic types
export declare type MnemonicSubscriptionResult = {
  confirmed?: boolean
}

export declare type RequestAddressFromMnemonic = {
  mnemonic: string
  type?: AccountAddressType
}

export interface MnemonicMessages {
  // mnemonic message signatures
  "pri(mnemonic.unlock)": [string, string]
  "pri(mnemonic.confirm)": [boolean, boolean]
  "pri(mnemonic.subscribe)": [null, boolean, MnemonicSubscriptionResult]
  "pri(mnemonic.address)": [RequestAddressFromMnemonic, string]
}

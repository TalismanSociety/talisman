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

export interface AccountJsonHardware extends AccountJson {
  isHardware: true
  accountIndex: number
  addressOffset: number
  genesisHash: string
}

export interface AccountJsonHardwareEthereum extends AccountJson {
  isHardware: true
  path: string
}

export type AccountJsonAny = AccountJsonHardwareEthereum | AccountJsonHardware | AccountJson

export type IdenticonType = "talisman-orb" | "polkadot-identicon"

export interface AccountMeta extends AccountJson {
  name: string
  origin: "ROOT" | "DERIVED" | "SEED" | "JSON" | "HARDWARE"
}

export interface Account {
  address: Address
  meta: AccountMeta
}

export type AccountsList = Account[]

export type AccountAddressType = "sr25519" | "ethereum"

export interface RequestAccountCreate {
  name: string
}

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

export interface RequestAccountForget {
  address: string
}

export interface RequestAccountExport {
  address: string
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
  "pri(accounts.create)": [RequestAccountCreate, boolean]
  "pri(accounts.create.seed)": [RequestAccountCreateFromSeed, boolean]
  "pri(accounts.create.json)": [RequestAccountCreateFromJson, boolean]
  "pri(accounts.create.hardware)": [Omit<RequestAccountCreateHardware, "hardwareType">, boolean]
  "pri(accounts.create.hardware.eth)": [RequestAccountCreateHardwareEthereum, boolean]
  "pri(accounts.forget)": [RequestAccountForget, boolean]
  "pri(accounts.export)": [RequestAccountExport, ResponseAccountExport]
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

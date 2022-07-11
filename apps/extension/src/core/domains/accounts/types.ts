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

export type AccountJsonAny = AccountJsonHardware | AccountJson

export type IdenticonType = "talisman-orb" | "polkadot-identicon"

export interface AccountMeta extends AccountJson {
  name: string
  origin: "ROOT" | "DERIVED" | "SEED" | "JSON"
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
  "pri(accounts.forget)": [RequestAccountForget, boolean]
  "pri(accounts.export)": [RequestAccountExport, ResponseAccountExport]
  "pri(accounts.rename)": [RequestAccountRename, boolean]
  "pri(accounts.subscribe)": [RequestAccountSubscribe, boolean, AccountJson[]]
  "pri(accounts.validateMnemonic)": [string, boolean]
}

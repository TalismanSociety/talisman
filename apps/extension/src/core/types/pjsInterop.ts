/** Same shape as `SignerPayloadJSON` from `@polkadot/types/types` (single-sourced from @talismn/sapi) */
export type { SignerPayloadJSON } from "@talismn/sapi"

/** Same shape as `SignerPayloadRaw` from `@polkadot/types/types` */
export interface SignerPayloadRaw {
  /** The hex-encoded data for this request */
  data: string
  /** The ss-58 encoded address */
  address: string
  /** The type of the contained data */
  type: "bytes" | "payload"
}

/** Same shape as `SignerResult` from `@polkadot/types/types` */
export interface SignerResult {
  /** The id for this request */
  id: number
  /** The resulting signature in hex */
  signature: HexString
  /** The signed transaction, when `withSignedTransaction` was enabled */
  signedTransaction?: HexString | Uint8Array
}

/** Same shape as `Message` from `@polkadot/extension-base/types` (dapp window message envelope) */
export interface PjsWindowMessage extends MessageEvent {
  data: {
    error?: string
    id: string
    origin: string
    response?: string
    subscription?: string
  }
}

import type { ExtDef, SignerPayloadJSON } from "@talismn/sapi"
import type { HexString } from "@talismn/util"

/**
 * Minimal structural types matching the polkadot-js keystore JSON formats, so we can
 * import/export pjs-compatible files without depending on `@polkadot/keyring` or
 * `@polkadot/ui-keyring` at runtime.
 */

/** Same shape as `KeyringPair$Json` from `@polkadot/keyring/types` */
export type PjsKeyringPairJson = {
  address: string
  encoded: string
  encoding: { content: string | string[]; type: string | string[]; version: string }
  meta: Record<string, unknown>
}

/** Same shape as `KeyringPairs$Json` from `@polkadot/ui-keyring/types` (batch export format) */
export type PjsKeyringPairsJson = {
  encoded: string
  encoding: { content: string | string[]; type: string | string[]; version: string }
  accounts: { address: string; meta: Record<string, unknown> }[]
}

/**
 * Structural copies of the legacy polkadot-js extension wire-protocol types
 * (`@polkadot/extension-inject/types` and `@polkadot/extension-base/background/types`),
 * so we can keep exposing the exact same dapp-facing protocol without depending on the
 * packages. Copied verbatim from v0.63.1 - these shapes are a public protocol, do not
 * "improve" them.
 */

/** Same as `KeypairType` from `@polkadot/util-crypto/types` */
export type KeypairType = "ed25519" | "sr25519" | "ecdsa" | "ethereum"

// ---------------------------------------------------------------------------
// @polkadot/extension-inject/types
// ---------------------------------------------------------------------------

export interface InjectedAccount {
  address: string
  genesisHash?: string | null
  name?: string
  type?: KeypairType
}

export interface ProviderMeta {
  network: string
  node: "full" | "light"
  source: string
  transport: string
}

/** Same as `ExtDef` from `@polkadot/types/extrinsic/signedExtensions/types` (single-sourced from @talismn/sapi) */
export type { ExtDef } from "@talismn/sapi"

export interface MetadataDefBase {
  chain: string
  genesisHash: HexString
  icon: string
  ss58Format: number
  chainType?: "substrate" | "ethereum"
}

export interface MetadataDef extends MetadataDefBase {
  color?: string
  specVersion: number
  tokenDecimals: number
  tokenSymbol: string
  types: Record<string, Record<string, string> | string>
  metaCalls?: string
  rawMetadata?: HexString
  userExtensions?: ExtDef
}

export interface InjectedMetadataKnown {
  genesisHash: string
  specVersion: number
}

export type ProviderList = Record<string, ProviderMeta>

// ---------------------------------------------------------------------------
// @polkadot/extension-base/background/types
// ---------------------------------------------------------------------------

/**
 * Same shape as `AccountJson` from `@polkadot/extension-base/background/types`,
 * i.e. `KeyringPair$Meta` from `@polkadot/keyring/types` (flattened here) with a
 * required address
 */
export interface AccountJson {
  address: string
  // KeyringPair$MetaExtension
  source?: string
  // KeyringPair$MetaFlags
  isDefaultAuthSelected?: boolean
  isExternal?: boolean
  isHardware?: boolean
  isHidden?: boolean
  isInjected?: boolean
  isMultisig?: boolean
  isProxied?: boolean
  isRecent?: boolean
  isTesting?: boolean
  // KeyringPair$MetaHardware
  accountIndex?: number
  accountOffset?: number
  addressOffset?: number
  hardwareType?: "ledger"
  // KeyringPair$MetaMultisig
  threshold?: number
  who?: string[]
  // KeyringPair$MetaParent
  parentAddress?: string
  parentName?: string
  // KeyringPair$Meta
  contract?: { abi: string; genesisHash?: HexString | null }
  genesisHash?: HexString | null
  name?: string
  suri?: string
  tags?: string[]
  type?: KeypairType
  whenCreated?: number
  whenEdited?: number
  whenUsed?: number
  [key: string]: unknown
}

export interface MetadataRequest {
  id: string
  request: MetadataDef
  url: string
}

export interface RequestAuthorizeTab {
  origin: string
}

export interface RequestAccountList {
  anyType?: boolean
}

export type RequestAccountSubscribe = null

export interface RequestAccountUnsubscribe {
  id: string
}

export interface RequestRpcSend {
  method: string
  params: unknown[]
}

export interface RequestRpcSubscribe extends RequestRpcSend {
  type: string
}

export interface RequestRpcUnsubscribe {
  method: string
  subscriptionId: number | string
  type: string
}

export interface ResponseSigning {
  id: string
  signature: HexString
  signedTransaction?: HexString
}

export type ResponseRpcListProviders = ProviderList

// ---------------------------------------------------------------------------
// @polkadot/rpc-provider/types (referenced by the rpc entries of the map below)
// ---------------------------------------------------------------------------

export interface JsonRpcObject {
  id: number
  jsonrpc: "2.0"
}

export interface JsonRpcResponseBaseError {
  code: number
  data?: number | string
  message: string
}

interface JsonRpcResponseSingle<T> {
  error?: JsonRpcResponseBaseError
  result: T
}

interface JsonRpcResponseSubscription<T> {
  method?: string
  params: {
    error?: JsonRpcResponseBaseError
    result: T
    subscription: number | string
  }
}

export type JsonRpcResponseBase<T> = JsonRpcResponseSingle<T> & JsonRpcResponseSubscription<T>

export type JsonRpcResponse<T> = JsonRpcObject & JsonRpcResponseBase<T>

/**
 * The dapp-facing (window.injectedWeb3) subset of `RequestSignatures` from
 * `@polkadot/extension-base/background/types`.
 *
 * The upstream map also contains `pri(*)` entries (the polkadot-js extension's own
 * UI messages, which Talisman never handled - they used to be stripped via
 * `Omit<RequestSignatures, RemovedMessages>` or replaced by Talisman's own domain
 * message maps) and `pub(authorize.tab)`, which Talisman redefines in
 * `AuthorisedSiteMessages`. Only the entries actually served to dapps are kept here.
 */
export interface RequestSignatures {
  "pub(accounts.list)": [RequestAccountList, InjectedAccount[]]
  "pub(accounts.subscribe)": [RequestAccountSubscribe, string, InjectedAccount[]]
  "pub(accounts.unsubscribe)": [RequestAccountUnsubscribe, boolean]
  "pub(bytes.sign)": [SignerPayloadRaw, ResponseSigning]
  "pub(extrinsic.sign)": [SignerPayloadJSON, ResponseSigning]
  "pub(metadata.list)": [null, InjectedMetadataKnown[]]
  "pub(metadata.provide)": [MetadataDef, boolean]
  "pub(phishing.redirectIfDenied)": [null, boolean]
  "pub(ping)": [null, boolean]
  // upstream uses `void` for the request slot, `undefined` is equivalent here (and doesn't upset biome)
  "pub(rpc.listProviders)": [undefined, ResponseRpcListProviders]
  "pub(rpc.send)": [RequestRpcSend, JsonRpcResponse<unknown>]
  "pub(rpc.startProvider)": [string, ProviderMeta]
  "pub(rpc.subscribe)": [RequestRpcSubscribe, number, JsonRpcResponse<unknown>]
  "pub(rpc.subscribeConnected)": [null, boolean, boolean]
  "pub(rpc.unsubscribe)": [RequestRpcUnsubscribe, boolean]
}

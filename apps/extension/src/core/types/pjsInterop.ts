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

// ---------------------------------------------------------------------------
// @polkadot/extension-base/background/types
// ---------------------------------------------------------------------------

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

export interface ResponseSigning {
  id: string
  signature: HexString
  signedTransaction?: HexString
}

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
}

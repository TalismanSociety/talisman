import { getLookupFn } from "@polkadot-api/metadata-builders"
import { ChainId } from "extension-core"
import { log } from "extension-shared"

import { ScaleMetadata } from "./types"

export const getDispatchErrorMessage = (
  chainId: ChainId,
  metadata: ScaleMetadata,
  err: unknown,
): string | null => {
  try {
    if (!err) return null

    const error = err as UnsafeDispatchError
    if (!error.type) throw new Error("Unknown dispatch error")

    const lv1 = DISPATCH_ERROR[error.type as keyof typeof DISPATCH_ERROR]
    if (!lv1) throw new Error("Unknown dispatch error")
    if (lv1 === ERROR_METADATA_LOOKUP)
      return getModuleErrorMessage(chainId, metadata, error.value as UnsafeModuleError)
    if (typeof lv1 === "string") return lv1

    const lv2 = lv1[error.value?.type as keyof typeof lv1]
    if (!lv2) throw new Error("Unknown dispatch error")
    if (typeof lv2 === "string") return lv2

    throw new Error("Unknown dispatch error")
  } catch (cause) {
    log.error("Failed to parse runtime error", { chainId, cause, err })
    return tryFormatError(err)
  }
}

const ERROR_METADATA_LOOKUP = "METADATA_LOOKUP"

// only `Module` errors are part of the metadata
// errors below are defined as part of the runtime but their docs aren't included in the metadata
// so those are copy/pasted from the polkadot-sdk repo

// https://github.com/paritytech/polkadot-sdk/blob/56d97c3ad8c86e602bc7ac368751210517c4309f/substrate/primitives/runtime/src/lib.rs#L543
const ERRORS_TRANSACTIONAL = {
  LimitReached: "Too many transactional layers have been spawned",
  NoLayer: "A transactional layer was expected, but does not exist",
}

// https://github.com/paritytech/polkadot-sdk/blob/56d97c3ad8c86e602bc7ac368751210517c4309f/substrate/primitives/runtime/src/lib.rs#L672
const ERRORS_TOKEN = {
  FundsUnavailable: "Funds are unavailable",
  OnlyProvider: "Account that must exist would die",
  BelowMinimum: "Account cannot exist with the funds that would be given",
  CannotCreate: "Account cannot be created",
  UnknownAsset: "The asset in question is unknown",
  Frozen: "Funds exist but are frozen",
  Unsupported: "Operation is not supported by the asset",
  CannotCreateHold: "Account cannot be created for recording amount on hold",
  NotExpendable: "Account that is desired to remain would die",
  Blocked: "Account cannot receive the assets",
}

// https://github.com/paritytech/polkadot-sdk/blob/56d97c3ad8c86e602bc7ac368751210517c4309f/substrate/primitives/arithmetic/src/lib.rs#L76
const ERRORS_ARITHMETIC = {
  Overflow: "An underflow would occur",
  Underflow: "An overflow would occur",
  DivisionByZero: "Division by zero",
}

// https://github.com/paritytech/polkadot-sdk/blob/56d97c3ad8c86e602bc7ac368751210517c4309f/substrate/primitives/runtime/src/lib.rs#L714
const DISPATCH_ERROR = {
  CannotLookup: "Cannot lookup",
  BadOrigin: "Bad origin",
  Module: ERROR_METADATA_LOOKUP,
  ConsumerRemaining: "Consumer remaining",
  NoProviders: "No providers",
  TooManyConsumers: "Too many consumers",
  Token: ERRORS_TOKEN,
  Arithmetic: ERRORS_ARITHMETIC,
  Transactional: ERRORS_TRANSACTIONAL,
  Exhausted: "Resources exhausted",
  Corruption: "State corrupt",
  Unavailable: "Resource unavailable",
  RootNotAllowed: "Root not allowed",
  Trie: "Unknown error", // unsupported,
  Other: "Unknown error", // unsupported,
}

type UnsafeDispatchError = {
  type: string
  value:
    | {
        type: string
        value:
          | {
              type: string
              value: undefined
            }
          | undefined
      }
    | undefined
}

type UnsafeModuleError = {
  type: string
  value: {
    type: string
    value: undefined
  }
}

const getModuleErrorMessage = (
  chainId: ChainId,
  metadata: ScaleMetadata,
  error: UnsafeModuleError,
): string => {
  try {
    if (!metadata) throw new Error("Could not fetch metadata")

    const pallet = metadata.pallets.find((p) => p.name === error.type)
    if (typeof pallet?.errors !== "number") throw new Error("Unknown pallet")

    const lookup = getLookupFn(metadata)

    const palletErrors = lookup(pallet.errors)
    if (palletErrors.type !== "enum" || !palletErrors.innerDocs[error.value.type]?.length)
      throw new Error("Unknown error type")

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return palletErrors.innerDocs[error.value.type]!.join(" ")
  } catch (err) {
    log.error("Failed to parse module error", { chainId, error, err })
    return [error.type, error.value.type].join(": ")
  }
}

const tryFormatError = (err: unknown): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsafeErr = err as any
    if (unsafeErr.type && unsafeErr.value?.type)
      return [unsafeErr.type, unsafeErr.value.type].join(": ")
  } catch (err) {
    // ignore
  }

  return "Unknown error"
}

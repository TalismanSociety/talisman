import type { AccountPlatform } from "@talismn/crypto"

import type { ChainPlatform } from "./transactions"

/** Mobile's `import_method_selected` values, plus the extension's own ways to add an account. */
export const ACCOUNT_METHODS = [
  "new",
  "recovery_phrase",
  "private_key",
  "json",
  "ledger",
  "polkadot_vault",
  "signet",
  "watch",
] as const
export type AccountMethod = (typeof ACCOUNT_METHODS)[number]

/** Mobile's `account_created` and `onboarding_completed` origins, plus the extension's own. */
export const ACCOUNT_ORIGINS = [
  "seed",
  "existing_seed",
  "private_key",
  "json",
  "watch",
  "ledger",
  "vault",
  "signet",
] as const
export type AccountOrigin = (typeof ACCOUNT_ORIGINS)[number]

/** The origins of an account whose key the wallet holds: `account_created`. */
export const CREATED_ORIGINS = [
  "seed",
  "existing_seed",
  "private_key",
  "json",
] as const satisfies readonly AccountOrigin[]
type CreatedOrigin = (typeof CREATED_ORIGINS)[number]

export const isCreatedOrigin = (origin: AccountOrigin): origin is CreatedOrigin =>
  (CREATED_ORIGINS as readonly AccountOrigin[]).includes(origin)

/** Mobile's `AccountFlow`: the wallet's first account belongs to onboarding. */
export const ACCOUNT_FLOWS = ["onboarding", "add_account"] as const

export const ACCOUNT_TREES = ["portfolio", "watched"] as const

export const ACCOUNT_MOVES = [
  "into_folder",
  "out_of_folder",
  "between_folders",
  "reordered",
] as const
export type AccountMove = (typeof ACCOUNT_MOVES)[number]

/** Mobile's `accountMoveAction`: a folder id before and after the drag, undefined at the root. */
export const accountMoveOf = (from: string | undefined, to: string | undefined): AccountMove => {
  if (from === to) return "reordered"
  if (!from) return "into_folder"
  if (!to) return "out_of_folder"
  return "between_folders"
}

export const chainPlatformOf = (platform: AccountPlatform): ChainPlatform | null =>
  platform === "bitcoin" ? null : platform

import type { AccountPlatform } from "@talismn/crypto"

import type { ChainPlatform } from "./transactions"

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

export const CREATED_ORIGINS = [
  "seed",
  "existing_seed",
  "private_key",
  "json",
] as const satisfies readonly AccountOrigin[]
type CreatedOrigin = (typeof CREATED_ORIGINS)[number]

export const isCreatedOrigin = (origin: AccountOrigin): origin is CreatedOrigin =>
  (CREATED_ORIGINS as readonly AccountOrigin[]).includes(origin)

export const ACCOUNT_FLOWS = ["onboarding", "add_account"] as const

export const ACCOUNT_TREES = ["portfolio", "watched"] as const

export const ACCOUNT_MOVES = [
  "into_folder",
  "out_of_folder",
  "between_folders",
  "reordered",
] as const
export type AccountMove = (typeof ACCOUNT_MOVES)[number]

export const accountMoveOf = (from: string | undefined, to: string | undefined): AccountMove => {
  if (from === to) return "reordered"
  if (!from) return "into_folder"
  if (!to) return "out_of_folder"
  return "between_folders"
}

export const chainPlatformOf = (platform: AccountPlatform): ChainPlatform | null =>
  platform === "bitcoin" ? null : platform

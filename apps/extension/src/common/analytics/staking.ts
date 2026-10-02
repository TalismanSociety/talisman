/** Mobile's staking entries (portfolio, token_details), plus the extension's own. */
export const STAKING_ENTRIES = [
  "portfolio",
  "token_details",
  "tao_dashboard",
  "earn",
  "fee_discount",
] as const
export type StakingEntry = (typeof STAKING_ENTRIES)[number]

export const STAKING_TYPES = ["bittensor", "nomination_pool", "seek"] as const

/** Mobile's stake, unstake and claim, plus the extension's other staking modals. */
export const STAKING_ACTIONS = [
  "stake",
  "unstake",
  "withdraw",
  "cancel_unstake",
  "claim",
  "change_validator",
  "lock",
  "change_lock_type",
  "change_lock_hotkey",
] as const
export type StakingAction = (typeof STAKING_ACTIONS)[number]

export const EARN_ENTRIES = ["discover", "portfolio", "position"] as const
export type EarnEntry = (typeof EARN_ENTRIES)[number]

export const EARN_SYSTEMS = ["yieldxyz", "seek", "defi"] as const

/** The validator list's sort orders. */
export const VALIDATOR_SORTS = ["featured", "name", "totalStaked", "totalStakers", "apr"] as const

const HEX_LIKE = /0x[0-9a-f]|[0-9a-f]{32}/i
const BASE58_LIKE = /[1-9A-HJ-NP-Za-km-z]{32}/

/** A yield.xyz id names a product, unless it embeds a contract or mint address: null then. */
export const yieldIdForAnalytics = (yieldId: string | null | undefined): string | null =>
  yieldId && yieldId.length <= 64 && !HEX_LIKE.test(yieldId) && !BASE58_LIKE.test(yieldId)
    ? yieldId
    : null

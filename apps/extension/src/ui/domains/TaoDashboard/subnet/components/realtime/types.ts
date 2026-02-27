/**
 * A staking event decoded from a best (non-finalized) block via sapi.
 * Mirrors the sn45 API StakeEvent shape but uses native types (bigint amounts, ms epoch timestamp).
 */
export type RealtimeStakeEvent = {
  method: "Adding" | "Removing"
  taoAmount: bigint
  alphaAmount: bigint
  coldkey: string
  hotkey: string
  /** Extrinsic hash (blake2b-256 of the raw extrinsic bytes) */
  hash: string
  /** Block number where this event was included */
  blockHeight: number
  /** Unix timestamp in milliseconds (approximated from Date.now() at decode time) */
  timestamp: number
}

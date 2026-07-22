import type { BitcoinAddressType } from "./types"

/** BIP44 gap limit: scanning stops after this many consecutive unused addresses */
export const BITCOIN_GAP_LIMIT = 20

/** default relay dust thresholds per output type */
export const DUST_LIMIT_SATS: Record<BitcoinAddressType, bigint> = {
  p2wpkh: 294n,
  p2tr: 330n,
}

/** conservative dust floor for recipient amounts regardless of output type */
export const DUST_LIMIT_MAX_SATS = 546n

/** how many addresses are queried concurrently during a gap scan */
export const SCAN_BATCH_SIZE = 10

/**
 * Input sequence signalling BIP125 replace-by-fee. Also below 0xfffffffe, which
 * makes nLockTime enforceable — required for the anti-fee-sniping locktime.
 */
export const RBF_SEQUENCE = 0xfffffffd

/**
 * Hard ceiling on accepted fee rates. Fee estimates come from remote services; this
 * bounds the damage of a compromised or broken source. Historic mempool peaks stayed
 * well below this.
 */
export const MAX_SANE_FEE_RATE_SAT_VB = 2_000

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

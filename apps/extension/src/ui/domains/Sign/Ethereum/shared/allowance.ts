import { hexToBigInt } from "viem"

export const ERC20_UNLIMITED_ALLOWANCE = hexToBigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
)

// no token has anywhere near 2^128 of its smallest unit in circulation, so an allowance above this
// can never be spent in full: it is an unlimited approval, whichever near-max value was used
// (uint256 max, uint256 max / 2, uint160 max for Permit2, ...)
const UNLIMITED_ALLOWANCE_THRESHOLD = 2n ** 128n

export const isUnlimitedAllowance = (allowance: bigint) =>
  allowance >= UNLIMITED_ALLOWANCE_THRESHOLD

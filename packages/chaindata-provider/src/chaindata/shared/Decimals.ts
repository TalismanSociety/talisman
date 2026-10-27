import z from "zod/v4"

/**
 * The largest value in the chaindata feed is 27. The bound leaves room above that and keeps
 * `10 ** decimals` within what amount and display maths can handle.
 */
const MAX_DECIMALS = 36

/** number of decimal places between a token's base unit (planck) and its display unit */
export const DecimalsSchema = z.int().min(0).max(MAX_DECIMALS)

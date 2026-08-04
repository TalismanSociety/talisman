import { type Balance, CLAIMABLE_REWARDS_LABEL } from "@talismn/balances"

/** Sum of the balance's claimable root rewards (TAO plancks, marked NAV quote) */
export const getBalanceClaimablePlancks = (balance: Balance): bigint =>
  balance.locks
    .filter((lock) => lock.label === CLAIMABLE_REWARDS_LABEL)
    .reduce((sum, lock) => sum + lock.amount.planck, 0n)

import type {
  AmountWithLabel,
  BalanceStatusTypes,
  ExtraAmount,
  IBalance,
} from "../types/balancetypes"

const getRawValues = (
  balance: IBalance,
  valueType: BalanceStatusTypes
): AmountWithLabel<string>[] =>
  "values" in balance && balance.values
    ? balance.values.filter(({ type }) => type === valueType)
    : []

/** raw "locked" values, straight from the IBalance JSON (see getRawTotalPlanck) */
export const getRawLocks = (balance: IBalance): AmountWithLabel<string>[] =>
  getRawValues(balance, "locked")

const sumPlancks = (values: AmountWithLabel<string>[]): bigint =>
  values.reduce((sum, { amount }) => sum + BigInt(amount), 0n)

/**
 * Computes `new Balance(b).total.planck` without constructing a Balance (which allocates
 * several BalanceFormatters per access) — used for high-frequency zero-balance filtering.
 * MUST mirror Balance.total exactly, including the DelegatedStaking-hold/nompool rule
 * (guarded by a parity test in balance-raw-helpers.test.ts).
 */
export const getRawTotalPlanck = (balance: IBalance): bigint => {
  const free =
    "value" in balance && balance.value
      ? BigInt(balance.value)
      : sumPlancks(getRawValues(balance, "free"))
  const reserved = sumPlancks(getRawValues(balance, "reserved"))

  // if there is a DelegatedStaking hold (new model: polkadot, kusama), nom pool staked amount is included in reserved
  // if not (old model: vara, avail, cere), staked amount is not in the account and it needs to be added to the total
  const nomPoolStakedPlancks = getRawLocks(balance).some(
    (lock) => lock.source === "substrate-native-holds" && lock.label === "DelegatedStaking"
  )
    ? 0n
    : sumPlancks(getRawValues(balance, "nompool"))

  const extra = (getRawValues(balance, "extra") as ExtraAmount<string>[])
    .filter((extra) => extra.includeInTotal)
    .reduce((sum, { amount }) => sum + BigInt(amount), 0n)

  return free + reserved + nomPoolStakedPlancks + extra
}

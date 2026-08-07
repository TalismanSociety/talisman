export type BittensorFullExitUnstakeInputs = {
  isRootUnbond: boolean
  amountIn: bigint | null
  /** the selected position's whole stake */
  totalStakedPlancks: bigint
  /** stake minus conviction locks: below the total, part of the position must stay */
  availableToUnstakePlancks: bigint
  /** the claim call is actually batched into the unstake */
  includeClaim: boolean
  /** fresh RootStakeUnlockInterval read, fail-closed while unresolved */
  holdIntervalBlocks: bigint
  isHoldIntervalReady: boolean
}

/**
 * Decides whether a root unstake can use the claim-first full-exit batch
 * `[claim_root_with_hotkey, remove_stake_full_limit]`: claiming re-stakes the rewards onto
 * root, and the remove-full then sweeps stake + rewards in the same transaction.
 *
 * Claiming also restarts the `RootStakeUnlockInterval` hold for the pair, which would make
 * the subsequent remove revert with `RootStakeLocked` — so this order is only built when a
 * fresh interval read proves the hold window is disabled (0, its current on-chain value).
 * Everything else falls back to the remove-then-claim order, which re-stakes the rewards.
 */
export const getBittensorFullExitUnstake = ({
  isRootUnbond,
  amountIn,
  totalStakedPlancks,
  availableToUnstakePlancks,
  includeClaim,
  holdIntervalBlocks,
  isHoldIntervalReady,
}: BittensorFullExitUnstakeInputs): boolean =>
  isRootUnbond &&
  includeClaim &&
  typeof amountIn === "bigint" &&
  amountIn > 0n &&
  amountIn >= totalStakedPlancks &&
  availableToUnstakePlancks >= totalStakedPlancks &&
  isHoldIntervalReady &&
  holdIntervalBlocks === 0n

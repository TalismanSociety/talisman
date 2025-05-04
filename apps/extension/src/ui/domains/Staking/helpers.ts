import { Enum } from "@polkadot-api/substrate-bindings"
import { ScaleApi } from "@talismn/sapi"
import { isNotNil } from "@talismn/util"
import { range } from "lodash"
import { Binary } from "polkadot-api"

import { type StakeType } from "./Bittensor/hooks/useBittensorBondWizard"
import { ROOT_NETUID, TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR } from "./Bittensor/utils/constants"

export const getStakingErasPerYear = (sapi: ScaleApi) => {
  const MS_PER_YEAR = 1000n * 60n * 60n * 24n * 365n
  const eraDuration = getStakingEraDurationMs(sapi)

  return MS_PER_YEAR / eraDuration
}

export const getStakingEraDurationMs = (sapi: ScaleApi) => {
  const isAlephZero = ["aleph-zero", "aleph-zero-testnet"].includes(sapi.chainId)

  // on Polkadot, 6000n (6000ms=6s)
  const blockTime = isAlephZero ? 1000n : sapi.getConstant<bigint>("Babe", "ExpectedBlockTime")

  // on Polkadot, 2400n
  const epochDuration = isAlephZero
    ? 60n * 15n // 15 minutes
    : sapi.getConstant<bigint>("Babe", "EpochDuration")

  // on Polkadot, 6
  const sessionsPerEra = sapi.getConstant<number>("Staking", "SessionsPerEra")

  // on Polkadot, 6000n * 6n * 2400n = 86,400,000ms = 24 hours
  return blockTime * BigInt(sessionsPerEra) * epochDuration
}

export const getStakingBondingDurationMs = (sapi: ScaleApi) => {
  // returns a number of eras
  // on Polkadot, 28
  const bondingDuration = sapi.getConstant<number>("Staking", "BondingDuration")

  const eraDuration = getStakingEraDurationMs(sapi)

  return BigInt(bondingDuration) * eraDuration
}

export const STAKING_APR_UNAVAILABLE = "APR Unavailable"

export const getStakingAPR = async (sapi: ScaleApi) => {
  const historyDepth = sapi.getConstant<number>("Staking", "HistoryDepth")

  const currentEra = await sapi.getStorage<number>("Staking", "CurrentEra", [])
  if (!currentEra) throw new Error("Current era unavailable")

  const maxErasToCheck = Math.min(15, historyDepth)
  const eras = range(currentEra - maxErasToCheck, currentEra - 1).filter((era) => era >= 0)

  const [eraRewards, eraTotalStakes] = await Promise.all([
    Promise.all(
      eras.map((era) => sapi.getStorage<bigint>("Staking", "ErasValidatorReward", [era])),
    ),
    Promise.all(eras.map((era) => sapi.getStorage<bigint>("Staking", "ErasTotalStake", [era]))),
  ])

  const erasPerYear = getStakingErasPerYear(sapi)
  const RATIO_DIGITS = 10000n

  if (!eraRewards.some((reward) => reward !== null)) throw new Error(STAKING_APR_UNAVAILABLE)

  const totalRewards = eraRewards.reduce((acc, reward) => acc + reward, 0n)
  const totalStakes = eraTotalStakes.reduce((acc, stake) => acc + stake, 0n)

  const bigapr = (RATIO_DIGITS * erasPerYear * totalRewards) / totalStakes
  const apr = Number(bigapr) / Number(RATIO_DIGITS)

  return apr
}

export const getBittensorStakingPayload = async ({
  sapi,
  address,
  poolId,
  amount,
  stakeType,
  alphaPriceWithSlippagePlanks,
  netuid,
  talismanFee,
}: {
  sapi: ScaleApi
  address: string
  poolId: string | number
  amount: bigint
  stakeType: StakeType
  alphaPriceWithSlippagePlanks: bigint
  netuid: number | null
  talismanFee: bigint
}) => {
  if (stakeType === "root") {
    return sapi.getExtrinsicPayload(
      "Utility",
      "batch_all",
      {
        calls: [
          sapi.getDecodedCall("SubtensorModule", "add_stake", {
            hotkey: poolId,
            netuid: ROOT_NETUID,
            amount_staked: amount,
          }),
          sapi.getDecodedCall("System", "remark_with_event", {
            remark: Binary.fromText("talisman-bittensor"),
          }),
        ],
      },
      { address },
    )
  }
  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    {
      calls: [
        sapi.getDecodedCall("SubtensorModule", "add_stake_limit", {
          hotkey: poolId,
          netuid: netuid,
          amount_staked: amount,
          limit_price: alphaPriceWithSlippagePlanks,
          allow_partial: false,
        }),
        sapi.getDecodedCall("Balances", "transfer_keep_alive", {
          dest: Enum("Id", TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR),
          value: talismanFee,
        }),
        sapi.getDecodedCall("System", "remark_with_event", {
          remark: Binary.fromText("talisman-bittensor"),
        }),
      ],
    },
    { address },
  )
}

export const getNomPoolStakingPayload = async (
  sapi: ScaleApi,
  address: string,
  poolId: number | string,
  amount: bigint,
  isBondExtra: boolean,
  withSetClaimPermission: boolean,
) => {
  const call_joinPoolOrBondExtra = isBondExtra
    ? sapi.getDecodedCall("NominationPools", "bond_extra", { extra: Enum("FreeBalance", amount) })
    : sapi.getDecodedCall("NominationPools", "join", { amount, pool_id: poolId })

  const call_setClaimPermission = withSetClaimPermission
    ? sapi.getDecodedCall("NominationPools", "set_claim_permission", {
        permission: Enum("PermissionlessCompound"),
      })
    : undefined

  const call_remark = sapi.getDecodedCall("System", "remark_with_event", {
    remark: Binary.fromText("Seek the Talisman"),
  })

  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    { calls: [call_joinPoolOrBondExtra, call_setClaimPermission, call_remark].filter(isNotNil) },
    { address },
  )
}
export const cleanupNomPoolName = (name: string | null | undefined) =>
  name
    ?.replace(": app.talisman.xyz/staking", "")
    .replace(" | Auto-Compound > $2USD", "")
    .replace(" | Auto-Compound > 1 DOT", "") ?? null

import { Enum } from "@polkadot-api/substrate-bindings"
import { range } from "lodash"
import { Binary } from "polkadot-api"

import {
  EVM_LSD_SUPPORTED_CHAINS,
  EvmLsdSupportedChain,
  NOM_POOL_SUPPORTED_CHAINS,
  NomPoolSupportedChain,
  StakingSupportedChain,
} from "@extension/core"
import { ScaleApi } from "@ui/util/scaleApi"

type Colours = {
  text: string
  background: string
}

export const colours: Record<StakingSupportedChain, Colours> = {
  "polkadot": {
    text: "text-[#cc2c75]",
    background: "bg-[#260001]",
  },
  "kusama": {
    text: "text-body-secondary",
    background: "bg-[#303030]",
  },
  "aleph-zero": {
    text: "text-[#e5ff57]",
    background: "bg-[#2C2D30]",
  },
  "vara": {
    text: "text-[#00a87a]",
    background: "bg-[#002905]",
  },
  "avail": {
    text: "text-[#D0E5FF]",
    background: "bg-[#4E6786]",
  },
  "1": {
    text: "text-[#8b93b4]",
    background: "bg-[#151C2F]",
  },
}

export const isNomPoolChain = (chainId: string): chainId is NomPoolSupportedChain =>
  NOM_POOL_SUPPORTED_CHAINS.includes(chainId as NomPoolSupportedChain)

export const isEvmLsdChain = (networkId: string): networkId is EvmLsdSupportedChain =>
  EVM_LSD_SUPPORTED_CHAINS.includes(networkId as EvmLsdSupportedChain)

export const isStakingSupportedChain = (chainId: string): chainId is StakingSupportedChain =>
  isNomPoolChain(chainId) || isEvmLsdChain(chainId)

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

export const getStakingAPR = async (sapi: ScaleApi) => {
  const historyDepth = sapi.getConstant<number>("Staking", "HistoryDepth")

  const currentEra = await sapi.getStorage<number>("Staking", "CurrentEra", [])
  if (!currentEra) throw new Error("Current era unavailable")

  const maxErasToCheck = Math.min(15, historyDepth)
  const eras = range(currentEra - maxErasToCheck, currentEra - 1)

  const [eraRewards, eraTotalStakes] = await Promise.all([
    Promise.all(
      eras.map((era) => sapi.getStorage<bigint>("Staking", "ErasValidatorReward", [era])),
    ),
    Promise.all(eras.map((era) => sapi.getStorage<bigint>("Staking", "ErasTotalStake", [era]))),
  ])

  const erasPerYear = getStakingErasPerYear(sapi)
  const RATIO_DIGITS = 10000n

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
}: {
  sapi: ScaleApi
  address: string
  poolId: string | number
  amount: bigint
}) => {
  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    {
      calls: [
        sapi.getDecodedCall("SubtensorModule", "add_stake", {
          hotkey: poolId,
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

export const getNomPoolStakingPayload = async (
  sapi: ScaleApi,
  address: string,
  poolId: number | string,
  amount: bigint,
  isBondExtra: boolean,
  withSetClaimPermission: boolean,
) => {
  if (withSetClaimPermission)
    return sapi.getExtrinsicPayload(
      "Utility",
      "batch_all",
      {
        calls: [
          isBondExtra
            ? sapi.getDecodedCall("NominationPools", "bond_extra", {
                extra: Enum("FreeBalance", amount),
              })
            : sapi.getDecodedCall("NominationPools", "join", { amount, pool_id: poolId }),
          sapi.getDecodedCall("NominationPools", "set_claim_permission", {
            permission: Enum("PermissionlessCompound"),
          }),
        ],
      },
      { address },
    )

  return isBondExtra
    ? sapi.getExtrinsicPayload(
        "NominationPools",
        "bond_extra",
        {
          extra: Enum("FreeBalance", amount),
        },
        { address },
      )
    : sapi.getExtrinsicPayload(
        "NominationPools",
        "join",
        {
          amount,
          pool_id: poolId,
        },
        { address },
      )
}
export const cleanupNomPoolName = (name: string | null | undefined) =>
  name
    ?.replace(": app.talisman.xyz/staking", "")
    .replace(" | Auto-Compound > $2USD", "")
    .replace(" | Auto-Compound > 1 DOT", "") ?? null

import { TokenId } from "@talismn/chaindata-provider"
import { range } from "lodash"

import {
  EVM_LSD_SUPPORTED_CHAINS,
  EvmLsdSupportedChain,
  NOM_POOL_SUPPORTED_CHAINS,
  NomPoolSupportedChain,
  StakingSupportedChain,
} from "@extension/core"
import { ScaleApi } from "@ui/util/scaleApi"

// import { fetchStorageValue, getConstantValue } from "@ui/util/scale"

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

// TODO derive from chaindata
export const isStakableToken = (tokenId: TokenId) =>
  ["polkadot-substrate-native", "polkadot-substrate-native"].includes(tokenId)

export const getStakingErasPerYear = (sapi: ScaleApi) => {
  const MS_PER_YEAR = 1000n * 60n * 60n * 24n * 365n
  const eraDuration = getStakingEraDurationMs(sapi)

  return MS_PER_YEAR / eraDuration
}

export const getStakingEraDurationMs = (
  sapi: ScaleApi
  // scaleBuilder: ReturnType<typeof getDynamicBuilder>,
  // metadata: V14 | V15
) => {
  // on Polkadot, 6000n (6000ms=6s)
  const blockTime = sapi.getConstant<bigint>("Babe", "ExpectedBlockTime")

  // on Polkadot, 2400n
  const epochDuration = sapi.getConstant<bigint>("Babe", "EpochDuration")

  // on Polkadot, 6
  const sessionsPerEra = sapi.getConstant<number>("Staking", "SessionsPerEra")

  // export const expectedSessionTime = (api: ApiPromise) => {
  //   switch (api.genesisHash.toString()) {
  //     // Aleph Zero
  //     case '0x70255b4d28de0fc4e1a193d7e175ad1ccef431598211c55538f1018651a0344e':
  //       return new BN(minutesToMilliseconds(15))
  //     // Astar
  //     case '0x9eb76c5184c4ab8679d2d5d819fdf90b9c001403e9e17da2e14b6d8aec4029c6':
  //       return expectedBlockTime(api).muln(7200)
  //     // Shibuya
  //     case '0xddb89973361a170839f80f152d2e9e38a376a5a7eccefcade763f46a8e567019':
  //       return expectedBlockTime(api).muln(1800)
  //     default:
  //       return new BN(
  //         (api.consts.babe?.epochDuration.toNumber() ?? api.registry.createType('u64', 1).toNumber()) *
  //           expectedBlockTime(api).toNumber()
  //       )
  //   }
  // }

  // on Polkadot, 6000n * 6n * 2400n = 86,400,000ms = 24 hours
  return blockTime * BigInt(sessionsPerEra) * epochDuration
}

export const getNomPoolsBondingDurationMs = (sapi: ScaleApi) => {
  // returns a number of eras
  // on Polkadot, 28
  const bondingDuration = sapi.getConstant<number>("Staking", "BondingDuration")

  const eraDuration = getStakingEraDurationMs(sapi)

  return BigInt(bondingDuration) * eraDuration
}

export const getNomPoolsAPR = async (sapi: ScaleApi) => {
  const historyDepth = sapi.getConstant<number>("Staking", "HistoryDepth")

  const currentEra = await sapi.getStorage<number>("Staking", "CurrentEra", [])
  if (!currentEra) throw new Error("Current era unavailable")

  const maxErasToCheck = Math.min(15, historyDepth)
  const eras = range(currentEra - maxErasToCheck, currentEra - 1)

  const [eraRewards, eraTotalStakes] = await Promise.all([
    Promise.all(
      eras.map((era) => sapi.getStorage<bigint>("Staking", "ErasValidatorReward", [era]))
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

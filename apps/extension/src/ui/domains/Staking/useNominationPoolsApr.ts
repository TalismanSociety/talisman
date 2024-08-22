import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { decodeMetadata, getDynamicBuilder, getLookupFn, V14, V15 } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"
import { log } from "extension-shared"
import { range } from "lodash"
import { useMemo } from "react"

import { api } from "@ui/api"
import useChain from "@ui/hooks/useChain"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"

export const useChainMetadata = (
  chainIdOrHash: ChainId | HexString | null | undefined,
  specVersion?: number,
  blockHash?: HexString
) => {
  const maybeChain1 = useChain(chainIdOrHash)
  const maybeChain2 = useChainByGenesisHash(chainIdOrHash)
  const chain = useMemo(() => maybeChain1 || maybeChain2, [maybeChain1, maybeChain2])

  return useQuery({
    queryKey: ["useChainMetadata", chain, specVersion, blockHash],
    queryFn: async () => {
      if (!chain?.genesisHash) return null

      const metadataDef = await api.subChainMetadata(chain.genesisHash, specVersion, blockHash)
      assert(metadataDef?.metadataRpc, `Metadata unavailable for chain ${chain.id}`)

      const hexMetadata = Buffer.from(metadataDef.metadataRpc, "base64").toString("hex")
      return decodeMetadata(hexMetadata)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}

// const getStorageValueFrontEnd = async <Result, Params extends unknown[]>(
//     provider: WsProvider,
//     metadata: V14 | V15,
//     palletName: string,
//     constantName: string,
//     keyParts: Params
//   ) => {
// }

const getConstantValue = <T>(
  metadata: V14 | V15,
  scaleBuilder: ReturnType<typeof getDynamicBuilder>,
  pallet: string,
  constant: string
) => {
  const storageCodec = scaleBuilder.buildConstant(pallet, constant)

  const encodedValue = metadata.pallets
    .find(({ name }) => name === pallet)
    ?.constants.find(({ name }) => name === constant)?.value

  if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

  return storageCodec.dec(encodedValue) as T
}

const fetchStorageValue = async <T>(
  chainId: ChainId,
  scaleBuilder: ReturnType<typeof getDynamicBuilder>,
  pallet: string,
  method: string,
  keys: unknown[]
) => {
  const storageCodec = scaleBuilder.buildStorage(pallet, method)
  const stateKey = storageCodec.enc(...keys)
  const hexValue = await api.subSend<string | null>(chainId, "state_getStorage", [stateKey])

  if (!hexValue) return null

  return storageCodec.dec(hexValue) as T
}

export const useNominationPoolsAPR = (chainId: ChainId) => {
  const { data: metadata } = useChainMetadata(chainId)

  return useQuery({
    queryKey: ["useNominationPoolsAPR", chainId, metadata?.metadataVersion],
    queryFn: async () => {
      if (!metadata?.metadata) return null

      // console.log({ metadata, chainId })

      const lookup = getLookupFn(metadata.metadata)
      const scaleBuilder = getDynamicBuilder(lookup)

      const historyDepth = getConstantValue<number>(
        metadata.metadata,
        scaleBuilder,
        "Staking",
        "HistoryDepth"
      )

      //  console.log({ historyDepth })

      const s1 = log.timer("useApr fetching current era")
      const currentEra = await fetchStorageValue<number>(
        chainId,
        scaleBuilder,
        "Staking",
        "CurrentEra",
        []
      )
      s1()
      //console.log({ currentEra })

      if (!currentEra) throw new Error("Current era unavailable")

      const maxErasToCheck = Math.min(15, historyDepth)
      const eras = range(currentEra - maxErasToCheck, currentEra - 1)

      //   type EraRewardPoints = { total: number; individual: [string, number][] }

      //   const eraRewardPoints = (await Promise.all(
      //     eras.map((era) =>
      //       fetchStorageValue<EraRewardPoints>(chainId, scaleBuilder, "Staking", "ErasRewardPoints", [
      //         era,
      //       ])
      //     )
      //   )) as EraRewardPoints[]

      //   const eraRewards = (await Promise.all(
      //     eras.map((era) =>
      //       fetchStorageValue<bigint>(chainId, scaleBuilder, "Staking", "ErasValidatorReward", [era])
      //     )
      //   )) as bigint[]
      //   const eraTotalStakes = (await Promise.all(
      //     eras.map((era) =>
      //       fetchStorageValue<bigint>(chainId, scaleBuilder, "Staking", "ErasTotalStake", [era])
      //     )
      //   )) as bigint[]

      const s2 = log.timer("useApr fetching era rewards")

      const [eraRewards, eraTotalStakes] = await Promise.all([
        Promise.all(
          eras.map((era) =>
            fetchStorageValue<bigint>(chainId, scaleBuilder, "Staking", "ErasValidatorReward", [
              era,
            ])
          )
        ) as Promise<bigint[]>,
        Promise.all(
          eras.map((era) =>
            fetchStorageValue<bigint>(chainId, scaleBuilder, "Staking", "ErasTotalStake", [era])
          )
        ) as Promise<bigint[]>,
      ])
      s2()

      const erasPerYear = 365n // TODO
      const RATIO_DIGITS = 10000n

      const totalRewards = eraRewards.reduce((acc, reward) => acc + reward, 0n)
      const totalStakes = eraTotalStakes.reduce((acc, stake) => acc + stake, 0n)
      const bigapr = (RATIO_DIGITS * erasPerYear * totalRewards) / totalStakes
      const apr = Number(bigapr) / Number(RATIO_DIGITS)

      return apr

      //  console.log({ eraRewardPoints })

      //   const lastEraTotalStake = await fetchStorageValue<bigint>(
      //     chainId,
      //     scaleBuilder,
      //     "Staking",
      //     "ErasTotalStake",
      //     [currentEra - 1]
      //   )

      //   const eraTotalStake = await Promise.all(
      //     eras.map((era) =>
      //       fetchStorageValue<bigint>(chainId, scaleBuilder, "Staking", "ErasTotalStake", [era])
      //     )
      //   )as bigint[]
      //   const totalIssuance = (await fetchStorageValue<bigint>(
      //     chainId,
      //     scaleBuilder,
      //     "Balances",
      //     "TotalIssuance",
      //     []
      //   )) as bigint
      //   const apr = eras.reduce((_era, idx) => {
      //     const reward = rewards[idx]
      //     const totalStake = totalStakes[idx]

      //   } )
      //  console.log("useApr", { currentEra, eraRewardPoints, totalIssuance })

      //   try {
      //     // const erasPerDay = 1 // TODO
      //     // const averageValidatorRewardPoints =
      //     //   eraRewardPoints.reduce((acc, era) => acc + BigInt(era.total), 0n) /
      //     //   BigInt(eraRewardPoints.length)
      //     // const averageRewardPointsPerDay = Number(averageValidatorRewardPoints) * erasPerDay
      //     // const aprn = (10000n * 365n * BigInt(Math.round(averageRewardPointsPerDay))) / totalIssuance
      //     // const apr = Number(aprn) / 10000
      //     // console.log("useApr", {
      //     //   currentEra,
      //     //   historyDepth,
      //     //   maxErasToCheck,
      //     //   eras,
      //     //   aprn,
      //     //   averageRewardPointsPerDay,
      //     //   apr,
      //     //   averageValidatorRewardPoints,
      //     //   totalIssuance,
      //     // })
      //     // return apr
      //   } catch (err) {
      //     console.error("useApr", { err })
      //     throw err
      //   }
      // const supplyStaked = (!lastEraTotalStake || !totalIssuance) ? 0 : Number(lastEraTotalStake) / Number(totalIssuance)

      // // const totalRewards = rewards.reduce((acc, reward) => acc + reward, 0)
      // // const totalRewards = rewards.reduce((acc, reward) => acc + reward, 0)

      //   console.log({ currentEra, historyDepth, maxErasToCheck, eras, rewards })

      //   //   const storageCodec = scaleBuilder.buildStorage("Staking", "CurrentEra")
      //   //   const stateKey = storageCodec.enc([])
      //   //   const hexCurrentEra = await api.subSend<string | null>(chainId, "state_getStorage", [
      //   //     stateKey,
      //   //   ])
      //   //   const currentEra = hexCurrentEra ? storageCodec.dec(hexCurrentEra) : null

      //   return currentEra as number
    },
    enabled: !!metadata,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}

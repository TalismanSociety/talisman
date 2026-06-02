import type { Account } from "@core/domains/keyring/exports"
import { isAccountOwned, isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import type { EthNetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import seekSinglePoolStakingAbi from "@ui/domains/Staking/Seek/seekSinglePoolStakingAbi"
import { useToken, useTokensMap } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useMemo } from "react"
import { erc20Abi, formatUnits } from "viem"

import {
  createSeekStakingMetadataPersister,
  createSeekStakingPositionPersister,
  createSeekStakingPositionsPersister,
} from "./seekStakingCache"

const SECONDS_IN_YEAR = 31_557_600n

export const SEEK_PROVIDER_ID = "seek" as const
export const SEEK_PROVIDER_LOGO_URI = "/favicon.svg"
export const SEEK_STAKING_QUERY_KEY = "seek-staking"

export type SeekStakingConfig = {
  tokenId: TokenId
  networkId: EthNetworkId
  stakingContractAddress: `0x${string}`
}

export type SeekStakingRawMetadata = {
  stakeTokenAddress: `0x${string}`
  rewardTokenAddress: `0x${string}`
  rewardRate: bigint
  totalStaked: bigint
  minStakeAmount: bigint
  withdrawDelay: bigint
}

export type SeekStakingMetadata = SeekStakingRawMetadata & {
  stakeTokenId: TokenId
  rewardTokenId: TokenId
  apr: number | null
}

export type SeekPendingWithdrawal = {
  amount: bigint
  unlockTimestamp: bigint
}

export type SeekAccountPosition = {
  address: string
  staked: bigint
  earned: bigint
  pendingWithdrawal: SeekPendingWithdrawal
}

export const getSeekErc20TokenId = (networkId: string, address: string): TokenId =>
  `${networkId}:evm-erc20:${address.toLowerCase()}` as TokenId

export const useSeekStakingConfig = (): SeekStakingConfig => {
  const remoteConfig = useRemoteConfig()

  return useMemo(
    () => ({
      tokenId: remoteConfig.seek.tokenId as TokenId,
      networkId: remoteConfig.seek.stakingContractNetworkId as EthNetworkId,
      stakingContractAddress: remoteConfig.seek.stakingContractAddress as `0x${string}`,
    }),
    [
      remoteConfig.seek.stakingContractAddress,
      remoteConfig.seek.stakingContractNetworkId,
      remoteConfig.seek.tokenId,
    ]
  )
}

const useSelectedEthereumAccounts = (): Account[] => {
  const { selectedAccounts } = usePortfolioNavigation()

  return useMemo(
    () =>
      selectedAccounts.filter(
        (account) => isAccountOwned(account) && isAccountPlatformEthereum(account)
      ),
    [selectedAccounts]
  )
}

export const calcSeekApr = ({
  rewardRate,
  totalStaked,
  stakeToken,
  rewardToken,
  stakeTokenUsd,
  rewardTokenUsd,
}: {
  rewardRate: bigint
  totalStaked: bigint
  stakeToken: Token | null
  rewardToken: Token | null
  stakeTokenUsd: number | undefined
  rewardTokenUsd: number | undefined
}) => {
  if (!totalStaked || !stakeToken || !rewardToken || !stakeTokenUsd || !rewardTokenUsd) return null

  const rewardsPerYear = Number(formatUnits(rewardRate * SECONDS_IN_YEAR, rewardToken.decimals))
  const totalStakedTokens = Number(formatUnits(totalStaked, stakeToken.decimals))
  if (!Number.isFinite(rewardsPerYear) || !Number.isFinite(totalStakedTokens) || !totalStakedTokens)
    return null

  return ((rewardsPerYear * rewardTokenUsd) / (totalStakedTokens * stakeTokenUsd)) * 100
}

export const useSeekStakingMetadata = () => {
  const config = useSeekStakingConfig()
  const publicClient = usePublicClient(config.networkId)
  const tokensMap = useTokensMap()
  const tokenRatesMap = useTokenRatesMap()
  const metadataPersister = useMemo(
    () => createSeekStakingMetadataPersister(config.networkId, config.stakingContractAddress),
    [config.networkId, config.stakingContractAddress]
  )

  const rawMetadataQuery = useQuery({
    queryKey: [
      SEEK_STAKING_QUERY_KEY,
      "metadata",
      publicClient?.uid,
      config.stakingContractAddress,
    ],
    queryFn: async (): Promise<SeekStakingRawMetadata | null> => {
      if (!publicClient) return null

      const [
        stakeTokenAddress,
        rewardTokenAddress,
        rewardRate,
        totalStaked,
        minStakeAmount,
        withdrawDelay,
      ] = await Promise.all([
        publicClient.readContract({
          abi: seekSinglePoolStakingAbi,
          address: config.stakingContractAddress,
          functionName: "STAKE_TOKEN",
        }),
        publicClient.readContract({
          abi: seekSinglePoolStakingAbi,
          address: config.stakingContractAddress,
          functionName: "REWARD_TOKEN",
        }),
        publicClient.readContract({
          abi: seekSinglePoolStakingAbi,
          address: config.stakingContractAddress,
          functionName: "rewardRate",
        }),
        publicClient.readContract({
          abi: seekSinglePoolStakingAbi,
          address: config.stakingContractAddress,
          functionName: "totalStaked",
        }),
        publicClient.readContract({
          abi: seekSinglePoolStakingAbi,
          address: config.stakingContractAddress,
          functionName: "minStakeAmount",
        }),
        publicClient.readContract({
          abi: seekSinglePoolStakingAbi,
          address: config.stakingContractAddress,
          functionName: "withdrawDelay",
        }),
      ])

      return {
        stakeTokenAddress,
        rewardTokenAddress,
        rewardRate,
        totalStaked,
        minStakeAmount,
        withdrawDelay: BigInt(withdrawDelay),
      }
    },
    enabled: !!publicClient,
    persister: metadataPersister,
    refetchInterval: 5 * 60 * 1000,
  })

  const metadata = useMemo((): SeekStakingMetadata | null => {
    const data = rawMetadataQuery.data
    if (!data) return null

    const stakeTokenId = getSeekErc20TokenId(config.networkId, data.stakeTokenAddress)
    const rewardTokenId = getSeekErc20TokenId(config.networkId, data.rewardTokenAddress)
    const stakeToken = (tokensMap[stakeTokenId] as Token | undefined) ?? null
    const rewardToken = (tokensMap[rewardTokenId] as Token | undefined) ?? null

    return {
      ...data,
      stakeTokenId,
      rewardTokenId,
      apr: calcSeekApr({
        rewardRate: data.rewardRate,
        totalStaked: data.totalStaked,
        stakeToken,
        rewardToken,
        stakeTokenUsd: tokenRatesMap[stakeTokenId]?.usd?.price,
        rewardTokenUsd: tokenRatesMap[rewardTokenId]?.usd?.price,
      }),
    }
  }, [config.networkId, rawMetadataQuery.data, tokenRatesMap, tokensMap])

  return { ...rawMetadataQuery, data: metadata }
}

export const useSeekStakingOpportunity = () => {
  const config = useSeekStakingConfig()
  const token = useToken(config.tokenId)
  const { data: metadata, status } = useSeekStakingMetadata()
  const selectedEthereumAccounts = useSelectedEthereumAccounts()

  return useMemo(
    () => ({
      status,
      data:
        token && selectedEthereumAccounts.length
          ? {
              id: "seek-staking",
              system: "seek",
              providerId: SEEK_PROVIDER_ID,
              providerName: "SEEK",
              providerLogoURI: SEEK_PROVIDER_LOGO_URI,
              tokenId: config.tokenId,
              networkId: config.networkId,
              title: "SEEK Staking",
              type: "staking",
              apr: metadata?.apr ?? null,
              searchTerms: ["SEEK", "SEEK Staking", "staking"],
            }
          : null,
    }),
    [
      config.networkId,
      config.tokenId,
      metadata?.apr,
      selectedEthereumAccounts.length,
      status,
      token,
    ]
  )
}

const readSeekAccountPosition = async (
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  contractAddress: `0x${string}`,
  address: `0x${string}`
): Promise<SeekAccountPosition> => {
  const [staked, earned, pendingWithdrawal] = await Promise.all([
    publicClient.readContract({
      abi: seekSinglePoolStakingAbi,
      address: contractAddress,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient.readContract({
      abi: seekSinglePoolStakingAbi,
      address: contractAddress,
      functionName: "earned",
      args: [address],
    }),
    publicClient.readContract({
      abi: seekSinglePoolStakingAbi,
      address: contractAddress,
      functionName: "pendingWithdrawals",
      args: [address],
    }),
  ])

  return {
    address,
    staked,
    earned,
    pendingWithdrawal: {
      amount: pendingWithdrawal[0],
      unlockTimestamp: BigInt(pendingWithdrawal[1]),
    },
  }
}

export const useSeekStakingPositions = () => {
  const config = useSeekStakingConfig()
  const publicClient = usePublicClient(config.networkId)
  const selectedEthereumAccounts = useSelectedEthereumAccounts()

  const accountAddresses = useMemo(
    () =>
      selectedEthereumAccounts
        .map((account) => account.address as `0x${string}`)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    [selectedEthereumAccounts]
  )
  const positionsPersister = useMemo(
    () =>
      createSeekStakingPositionsPersister(
        config.networkId,
        config.stakingContractAddress,
        accountAddresses
      ),
    [accountAddresses, config.networkId, config.stakingContractAddress]
  )

  return useQuery({
    queryKey: [
      SEEK_STAKING_QUERY_KEY,
      "positions",
      publicClient?.uid,
      config.stakingContractAddress,
      accountAddresses,
    ],
    queryFn: async () => {
      if (!publicClient) return []
      const positions = await Promise.all(
        accountAddresses.map((address) =>
          readSeekAccountPosition(publicClient, config.stakingContractAddress, address)
        )
      )
      return positions.filter(
        (position) =>
          position.staked > 0n || position.earned > 0n || position.pendingWithdrawal.amount > 0n
      )
    },
    enabled: !!publicClient,
    persister: positionsPersister,
    refetchInterval: 30_000,
  })
}

export const useSeekStakingPosition = (address: string | undefined) => {
  const config = useSeekStakingConfig()
  const publicClient = usePublicClient(config.networkId)
  const positionPersister = useMemo(
    () =>
      address
        ? createSeekStakingPositionPersister(
            config.networkId,
            config.stakingContractAddress,
            address
          )
        : undefined,
    [address, config.networkId, config.stakingContractAddress]
  )

  return useQuery({
    queryKey: [
      SEEK_STAKING_QUERY_KEY,
      "position",
      publicClient?.uid,
      config.stakingContractAddress,
      address,
    ],
    queryFn: async () => {
      if (!publicClient || !address) return null
      return readSeekAccountPosition(
        publicClient,
        config.stakingContractAddress,
        address as `0x${string}`
      )
    },
    enabled: !!publicClient && !!address,
    persister: positionPersister,
    refetchInterval: 30_000,
  })
}

export const useSeekErc20Allowance = (address: string | null, amount: bigint | null) => {
  const config = useSeekStakingConfig()
  const publicClient = usePublicClient(config.networkId)

  return useQuery({
    queryKey: [
      SEEK_STAKING_QUERY_KEY,
      "allowance",
      publicClient?.uid,
      config.tokenId,
      config.stakingContractAddress,
      address,
    ],
    queryFn: async () => {
      if (!publicClient || !address) return null
      return publicClient.readContract({
        abi: erc20Abi,
        address: config.tokenId.split(":").at(-1) as `0x${string}`,
        functionName: "allowance",
        args: [address as `0x${string}`, config.stakingContractAddress],
      })
    },
    enabled: !!publicClient && !!address && amount !== null && amount > 0n,
  })
}

export const getSeekPositionValueUsd = (
  position: SeekAccountPosition,
  token: Token | null,
  usdPrice: number | undefined
) => {
  if (!token || !usdPrice) return 0
  const planck = position.staked + position.pendingWithdrawal.amount + position.earned
  return Number(formatUnits(planck, token.decimals)) * usdPrice
}

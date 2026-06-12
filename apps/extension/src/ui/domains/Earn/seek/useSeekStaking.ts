import type { Account } from "@core/domains/keyring/exports"
import { isAccountOwned, isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import {
  type EthNetworkId,
  evmErc20TokenId,
  type Token,
  type TokenId,
} from "@talismn/chaindata-provider"
import { type UseQueryResult, useQueries, useQuery } from "@tanstack/react-query"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import seekSinglePoolStakingAbi from "@ui/domains/Staking/Seek/seekSinglePoolStakingAbi"
import { useToken, useTokensMap } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { useCallback, useMemo } from "react"
import { erc20Abi, formatUnits } from "viem"
import type { EarnOpportunity } from "../types"
import {
  createSeekStakingMetadataPersister,
  createSeekStakingPositionPersister,
  isSeekAccountPositionActive,
} from "./seekStakingCache"

const SECONDS_IN_YEAR = 31_557_600n

export const SEEK_PROVIDER_ID = "seek" as const
export const SEEK_PROVIDER_LOGO_URI = "/favicon.svg"
export const SEEK_STAKING_QUERY_KEY = "seek-staking"

export type SeekStakingConfig = {
  tokenId: TokenId
  // the SEEK ERC-20 contract address, extracted from tokenId ("<networkId>:evm-erc20:<address>")
  tokenAddress: `0x${string}`
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
export const useSeekStakingConfig = (): SeekStakingConfig => {
  const remoteConfig = useRemoteConfig()

  return useMemo(
    () => ({
      tokenId: remoteConfig.seek.tokenId as TokenId,
      tokenAddress: remoteConfig.seek.tokenId.split(":").at(-1) as `0x${string}`,
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
  // selectedAccounts is undefined when this runs outside the PortfolioNavigationProvider (e.g.
  // from a globally mounted modal), so don't assume the context is available
  const { selectedAccounts } = usePortfolioNavigation()

  return useMemo(
    () =>
      (selectedAccounts ?? []).filter(
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

export const useSeekStakingMetadata = ({ enabled = true }: { enabled?: boolean } = {}) => {
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
    enabled: enabled && !!publicClient,
    persister: metadataPersister,
    refetchInterval: 5 * 60 * 1000,
  })

  const metadata = useMemo((): SeekStakingMetadata | null => {
    const data = rawMetadataQuery.data
    if (!data) return null

    const stakeTokenId = config.tokenId
    const rewardTokenId = evmErc20TokenId(config.networkId, data.rewardTokenAddress)
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
  }, [config.networkId, config.tokenId, rawMetadataQuery.data, tokenRatesMap, tokensMap])

  return { ...rawMetadataQuery, data: metadata }
}

export const useSeekStakingOpportunity = () => {
  const config = useSeekStakingConfig()
  const token = useToken(config.tokenId)
  const selectedEthereumAccounts = useSelectedEthereumAccounts()
  const {
    data: metadata,
    status,
    isFetching,
  } = useSeekStakingMetadata({
    enabled: !!token && selectedEthereumAccounts.length > 0,
  })

  return useMemo(
    () => ({
      status,
      // exposed so consumers can treat SEEK as best-effort: only block on a genuine
      // in-flight fetch, never on the disabled/idle "pending" react-query state.
      isFetching,
      data:
        token && selectedEthereumAccounts.length
          ? ({
              id: "seek-staking",
              system: "seek",
              providerId: SEEK_PROVIDER_ID,
              providerLogoURI: SEEK_PROVIDER_LOGO_URI,
              tokenId: config.tokenId,
              networkId: config.networkId,
              title: "SEEK Staking",
              type: "staking",
              apr: metadata?.apr ?? null,
              searchTerms: ["SEEK", "SEEK Staking", "staking"],
            } satisfies EarnOpportunity)
          : null,
    }),
    [
      config.networkId,
      config.tokenId,
      isFetching,
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

// Shared by the single-position hook and the list hook (via useQueries) so both read and write the
// same per-address persisted entry. The list is just N independent single-address queries; there is
// no pool-wide blob to merge into, so each address caches and displays on its own.
const getSeekPositionQueryOptions = ({
  publicClient,
  networkId,
  stakingContractAddress,
  address,
}: {
  publicClient: ReturnType<typeof usePublicClient>
  networkId: EthNetworkId
  stakingContractAddress: `0x${string}`
  address: string | undefined
}) => ({
  queryKey: [
    SEEK_STAKING_QUERY_KEY,
    "position",
    publicClient?.uid,
    stakingContractAddress,
    address,
  ] as const,
  queryFn: async (): Promise<SeekAccountPosition | null> => {
    if (!publicClient || !address) return null
    return readSeekAccountPosition(publicClient, stakingContractAddress, address as `0x${string}`)
  },
  enabled: !!publicClient && !!address,
  // the persist key is scoped to the address (not the volatile publicClient.uid), so a cached
  // position displays instantly even after the rpc client is recreated or the selection changes
  persister: address
    ? createSeekStakingPositionPersister(
        networkId,
        stakingContractAddress,
        address as `0x${string}`
      )
    : undefined,
  refetchInterval: 30_000,
})

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

  const queries = useMemo(
    () =>
      accountAddresses.map((address) =>
        getSeekPositionQueryOptions({
          publicClient,
          networkId: config.networkId,
          stakingContractAddress: config.stakingContractAddress,
          address,
        })
      ),
    [accountAddresses, config.networkId, config.stakingContractAddress, publicClient]
  )

  // stable combine ref lets react-query apply structural sharing, keeping `data` referentially
  // stable when the underlying positions are unchanged
  const combine = useCallback(
    (results: UseQueryResult<SeekAccountPosition | null>[]) => ({
      data: results
        .map((result) => result.data)
        .filter(
          (position): position is SeekAccountPosition =>
            !!position && isSeekAccountPositionActive(position)
        ),
      isFetching: results.some((result) => result.isFetching),
      status: results.some((result) => result.status === "error")
        ? ("error" as const)
        : results.every((result) => result.status === "success")
          ? ("success" as const)
          : ("pending" as const),
    }),
    []
  )

  return useQueries({ queries, combine })
}

export const useSeekStakingPosition = (address: string | undefined) => {
  const config = useSeekStakingConfig()
  const publicClient = usePublicClient(config.networkId)

  return useQuery(
    useMemo(
      () =>
        getSeekPositionQueryOptions({
          publicClient,
          networkId: config.networkId,
          stakingContractAddress: config.stakingContractAddress,
          address,
        }),
      [address, config.networkId, config.stakingContractAddress, publicClient]
    )
  )
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
        address: config.tokenAddress,
        functionName: "allowance",
        args: [address as `0x${string}`, config.stakingContractAddress],
      })
    },
    enabled: !!publicClient && !!address && amount !== null && amount > 0n,
  })
}

export const getSeekPositionValueUsd = (
  position: SeekAccountPosition,
  {
    stakeToken,
    rewardToken,
    stakeTokenUsd,
    rewardTokenUsd,
  }: {
    stakeToken: Token | null
    rewardToken: Token | null
    stakeTokenUsd: number | undefined
    rewardTokenUsd: number | undefined
  }
) => {
  // staked + pending unstake are denominated in the stake token, earned rewards in the
  // reward token. They can differ (the contract exposes STAKE_TOKEN/REWARD_TOKEN separately),
  // so value each leg with its own decimals + price.
  let total = 0
  if (stakeToken && stakeTokenUsd) {
    const stakedPlanck = position.staked + position.pendingWithdrawal.amount
    total += Number(formatUnits(stakedPlanck, stakeToken.decimals)) * stakeTokenUsd
  }
  if (rewardToken && rewardTokenUsd && position.earned > 0n)
    total += Number(formatUnits(position.earned, rewardToken.decimals)) * rewardTokenUsd
  return total
}

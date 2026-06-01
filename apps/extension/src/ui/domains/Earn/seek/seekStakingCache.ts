import type { EthNetworkId } from "@talismn/chaindata-provider"

import {
  createEarnQueryCachePersister,
  getEarnQueryCacheKey,
  removeEarnQueryCacheEntry,
} from "../hooks/earnQueryCache"
import type { SeekAccountPosition, SeekStakingRawMetadata } from "./useSeekStaking"

const normalizeAddress = (address: string) => address.toLowerCase()
const SEEK_CACHE_PROVIDER_ID = "seek"

const isNotNull = <T>(value: T | null): value is T => value !== null

const getSeekStakingMetadataCacheKey = (
  networkId: EthNetworkId,
  stakingContractAddress: `0x${string}`
) =>
  getEarnQueryCacheKey({
    providerId: SEEK_CACHE_PROVIDER_ID,
    resource: "metadata",
    scope: [networkId, stakingContractAddress],
  })

export const getSeekStakingPositionCacheKey = (
  networkId: EthNetworkId,
  stakingContractAddress: `0x${string}`,
  address: string
) =>
  getEarnQueryCacheKey({
    providerId: SEEK_CACHE_PROVIDER_ID,
    resource: "position",
    scope: [networkId, stakingContractAddress, normalizeAddress(address)],
  })

export const getSeekStakingPositionsCacheKey = (
  networkId: EthNetworkId,
  stakingContractAddress: `0x${string}`,
  addresses: readonly string[]
) =>
  getEarnQueryCacheKey({
    providerId: SEEK_CACHE_PROVIDER_ID,
    resource: "positions",
    scope: [networkId, stakingContractAddress, addresses.map(normalizeAddress).sort().join(",")],
  })

type SeekStakingRawMetadataDto = Omit<
  SeekStakingRawMetadata,
  "rewardRate" | "totalStaked" | "minStakeAmount" | "withdrawDelay"
> & {
  rewardRate: string
  totalStaked: string
  minStakeAmount: string
  withdrawDelay: string
}

type SeekPendingWithdrawalDto = {
  amount: string
  unlockTimestamp: string
}

type SeekAccountPositionDto = Omit<
  SeekAccountPosition,
  "staked" | "earned" | "pendingWithdrawal"
> & {
  staked: string
  earned: string
  pendingWithdrawal: SeekPendingWithdrawalDto
}

export const serializeSeekStakingMetadata = (
  metadata: SeekStakingRawMetadata | null
): SeekStakingRawMetadataDto | null =>
  metadata
    ? {
        ...metadata,
        rewardRate: metadata.rewardRate.toString(),
        totalStaked: metadata.totalStaked.toString(),
        minStakeAmount: metadata.minStakeAmount.toString(),
        withdrawDelay: metadata.withdrawDelay.toString(),
      }
    : null

export const deserializeSeekStakingMetadata = (
  metadata: SeekStakingRawMetadataDto | null
): SeekStakingRawMetadata | null =>
  metadata
    ? {
        ...metadata,
        rewardRate: BigInt(metadata.rewardRate),
        totalStaked: BigInt(metadata.totalStaked),
        minStakeAmount: BigInt(metadata.minStakeAmount),
        withdrawDelay: BigInt(metadata.withdrawDelay),
      }
    : null

const serializeSeekStakingPosition = (
  position: SeekAccountPosition | null
): SeekAccountPositionDto | null =>
  position
    ? {
        ...position,
        staked: position.staked.toString(),
        earned: position.earned.toString(),
        pendingWithdrawal: {
          amount: position.pendingWithdrawal.amount.toString(),
          unlockTimestamp: position.pendingWithdrawal.unlockTimestamp.toString(),
        },
      }
    : null

const deserializeSeekStakingPosition = (
  position: SeekAccountPositionDto | null
): SeekAccountPosition | null =>
  position
    ? {
        ...position,
        staked: BigInt(position.staked),
        earned: BigInt(position.earned),
        pendingWithdrawal: {
          amount: BigInt(position.pendingWithdrawal.amount),
          unlockTimestamp: BigInt(position.pendingWithdrawal.unlockTimestamp),
        },
      }
    : null

export const serializeSeekStakingPositions = (
  positions: SeekAccountPosition[]
): SeekAccountPositionDto[] => positions.map(serializeSeekStakingPosition).filter(isNotNull)

export const deserializeSeekStakingPositions = (
  positions: SeekAccountPositionDto[]
): SeekAccountPosition[] => positions.map(deserializeSeekStakingPosition).filter(isNotNull)

export const createSeekStakingMetadataPersister = (
  networkId: EthNetworkId,
  stakingContractAddress: `0x${string}`
) =>
  createEarnQueryCachePersister<SeekStakingRawMetadata | null, SeekStakingRawMetadataDto | null>({
    key: getSeekStakingMetadataCacheKey(networkId, stakingContractAddress),
    serialize: serializeSeekStakingMetadata,
    deserialize: deserializeSeekStakingMetadata,
  })

export const createSeekStakingPositionPersister = (
  networkId: EthNetworkId,
  stakingContractAddress: `0x${string}`,
  address: string
) =>
  createEarnQueryCachePersister<SeekAccountPosition | null, SeekAccountPositionDto | null>({
    key: getSeekStakingPositionCacheKey(networkId, stakingContractAddress, address),
    serialize: serializeSeekStakingPosition,
    deserialize: deserializeSeekStakingPosition,
  })

export const createSeekStakingPositionsPersister = (
  networkId: EthNetworkId,
  stakingContractAddress: `0x${string}`,
  addresses: readonly string[]
) =>
  createEarnQueryCachePersister<SeekAccountPosition[], SeekAccountPositionDto[]>({
    key: getSeekStakingPositionsCacheKey(networkId, stakingContractAddress, addresses),
    serialize: serializeSeekStakingPositions,
    deserialize: deserializeSeekStakingPositions,
  })

export const removeSeekStakingPositionCache = async ({
  networkId,
  stakingContractAddress,
  address,
  accountAddresses,
}: {
  networkId: EthNetworkId
  stakingContractAddress: `0x${string}`
  address: string
  accountAddresses: readonly string[]
}) => {
  await Promise.all([
    removeEarnQueryCacheEntry(
      getSeekStakingPositionCacheKey(networkId, stakingContractAddress, address)
    ),
    removeEarnQueryCacheEntry(
      getSeekStakingPositionsCacheKey(networkId, stakingContractAddress, accountAddresses)
    ),
  ])
}

import type { BittensorValidator } from "@core/domains/bittensor/exports"
import type { DefiPosition } from "@core/domains/defi/exports"
import { type Account, isAccountOwned } from "@core/domains/keyring/exports"
import {
  BalanceFormatter,
  type Balances,
  findDTaoConvictionLock,
  findDTaoRootStakeHold,
  getDTaoClaimablePlancks,
} from "@talismn/balances"
import {
  type DotNetworkId,
  type SubDTaoToken,
  subDTaoTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { normalizeAddress } from "@talismn/crypto"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { shortenAddress } from "@ui/util/shortenAddress"
import type { TFunction } from "i18next"
import type { ReactNode } from "react"

import type { EarnPosition, EarnPositionRowAction } from "../types"
import { getBittensorPositionDetailUrl } from "./bittensorPositionRoute"

export type BittensorStakeLock =
  | { kind: "root-stake-hold"; unlockAtBlock: number }
  | { kind: "conviction-lock"; amount: bigint; label: string }

export type BittensorStakePosition = {
  id: string
  kind: "root" | "subnet"
  networkId: DotNetworkId
  netuid: number
  hotkey: string
  address: string
  tokenId: TokenId
  groupTokenId: TokenId
  token: SubDTaoToken
  validatorName: string | null
  stake: bigint
  claimable: bigint
  totalUsd: number
  lock: BittensorStakeLock | null
  canSign: boolean
}

export type BittensorStakePositionContext = {
  bittensorNetworkIds: string[]
  accountsByAddress: Record<string, Account>
  validatorsByHotkey: Record<string, BittensorValidator>
}

const subnetLockKey = (address: string, networkId: string, netuid: number) =>
  `${normalizeAddress(address)}|${networkId}|${netuid}`

// the conviction lock is subnet-wide and reported on the hotkey-less base token balance
const getConvictionLocksBySubnet = (balances: Balances) => {
  const locks = new Map<string, BittensorStakeLock>()
  for (const balance of balances.each) {
    const token = balance.token
    if (token?.type !== "substrate-dtao") continue
    const lock = findDTaoConvictionLock(balance.locks)
    // ghost locks (zero mass, residual conviction) lock no stake
    if (!lock || lock.amount <= 0n) continue
    locks.set(subnetLockKey(balance.address, token.networkId, token.netuid), {
      kind: "conviction-lock",
      amount: lock.amount,
      label: lock.label,
    })
  }
  return locks
}

export const toBittensorStakePositions = (
  balances: Balances,
  { bittensorNetworkIds, accountsByAddress, validatorsByHotkey }: BittensorStakePositionContext
): BittensorStakePosition[] => {
  const convictionLocks = getConvictionLocksBySubnet(balances)
  const positions: BittensorStakePosition[] = []

  for (const balance of balances.each) {
    const token = balance.token
    if (token?.type !== "substrate-dtao" || !token.hotkey) continue
    if (!bittensorNetworkIds.includes(token.networkId)) continue

    const account = accountsByAddress[normalizeAddress(balance.address)]
    if (!account) continue

    const kind = token.netuid === ROOT_NETUID ? "root" : "subnet"
    const stake = balance.free.planck
    const claimable = kind === "root" ? getDTaoClaimablePlancks(balance.locks) : 0n
    if (stake === 0n && claimable === 0n) continue

    const rootStakeHold = kind === "root" ? findDTaoRootStakeHold(balance.toJSON()) : null

    positions.push({
      id: `bittensor-${balance.tokenId}-${balance.address}`,
      kind,
      networkId: token.networkId,
      netuid: token.netuid,
      hotkey: token.hotkey,
      address: balance.address,
      tokenId: balance.tokenId,
      groupTokenId:
        kind === "root"
          ? subNativeTokenId(token.networkId)
          : subDTaoTokenId(token.networkId, token.netuid),
      token,
      validatorName: validatorsByHotkey[token.hotkey]?.name || null,
      stake,
      claimable,
      totalUsd: balance.total.fiat("usd") ?? 0,
      lock: rootStakeHold
        ? { kind: "root-stake-hold", unlockAtBlock: rootStakeHold.unlockAtBlock }
        : kind === "subnet"
          ? (convictionLocks.get(subnetLockKey(balance.address, token.networkId, token.netuid)) ??
            null)
          : null,
      canSign: isAccountOwned(account),
    })
  }

  return positions.sort((a, b) => b.totalUsd - a.totalUsd)
}

export const getBittensorLockLabel = (
  lock: BittensorStakeLock,
  token: SubDTaoToken,
  t: TFunction
): string => {
  switch (lock.kind) {
    case "root-stake-hold":
      return t("Root stake is temporarily locked after staking or claiming")
    case "conviction-lock":
      return t("{{label}}: {{amount}} {{symbol}} of your stake on this subnet cannot be unstaked", {
        label: lock.label,
        amount: new BalanceFormatter(lock.amount, token.decimals).tokens,
        symbol: token.symbol,
      })
  }
}

export const getBittensorValidatorLabel = (position: BittensorStakePosition) =>
  position.validatorName ?? shortenAddress(position.hotkey)

export const getBittensorPositionTitle = (position: BittensorStakePosition, t: TFunction) =>
  position.kind === "root" ? t("TAO Staking") : (position.token.name ?? `SN${position.netuid}`)

export const toEarnPosition = ({
  position,
  apy,
  rowAction,
  subtitleIcon,
  t,
}: {
  position: BittensorStakePosition
  apy: number | null
  rowAction: EarnPositionRowAction | null
  subtitleIcon: ReactNode
  t: TFunction
}): EarnPosition => {
  const title = getBittensorPositionTitle(position, t)
  const validatorLabel = getBittensorValidatorLabel(position)

  return {
    id: position.id,
    address: position.address,
    networkId: position.networkId,
    logoUrl: position.token.logo ?? null,
    providerName: "Bittensor",
    title,
    type: "staking",
    isReadOnly: !position.canSign,
    displayTokens: [
      {
        tokenId: position.groupTokenId,
        symbol: position.token.symbol,
        logoUrl: position.token.logo ?? null,
      },
    ],
    totalAmountUsd: position.totalUsd,
    apr: apy,
    rateType: apy === null ? null : "APY",
    detailUrl: getBittensorPositionDetailUrl(position.tokenId, position.address),
    tokenIds: [position.groupTokenId],
    searchTerms: [
      "Bittensor",
      title,
      position.token.symbol,
      position.token.subnetName ?? "",
      validatorLabel,
      position.hotkey,
    ],
    subtitle: { label: validatorLabel, icon: subtitleIcon },
    lock: position.lock ? { label: getBittensorLockLabel(position.lock, position.token, t) } : null,
    rowAction,
  }
}

// a DeFi row overlapping a root position on native TAO is the same stake only when it is a staking
// row or names Bittensor; unrelated TAO exposure on the same address stays visible
export const isBittensorDefiPosition = (position: DefiPosition) =>
  position.type === "staking" ||
  /bittensor|subtensor/.test(
    [position.id, position.name, position.defiId, position.defiName, position.symbol ?? ""]
      .join(" ")
      .toLowerCase()
  )

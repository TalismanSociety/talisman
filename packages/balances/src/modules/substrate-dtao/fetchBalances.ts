import type { IChainConnectorDot } from "@talismn/chain-connectors"
import {
  getCleanToken,
  type SubDTaoToken,
  subDTaoTokenId,
  TokenSchema,
} from "@talismn/chaindata-provider"
import { decodeScale, type parseMetadataRpc } from "@talismn/scale"
import {
  createTimeSlicer,
  forEachWithYield,
  isAbortError,
  isNotNil,
  mapWithYield,
} from "@talismn/util"
import { keyBy, uniq } from "lodash-es"

import log from "../../log"
import type { AmountWithLabel, IBalance } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"
import { fetchRpcQueryPack, type MaybeStateKey, type RpcQueryPack } from "../shared/rpcQueryPack"
import { getBalanceDefs } from "../shared/types"
import { calculatePendingRootClaimable } from "./calculatePendingRootClaimable"
import { MODULE_TYPE } from "./config"
import { fetchConvictionLocks, getConvictionLockLabel } from "./convictionLocks"
import type { GetStakeInfosResult, SubDTaoBalance, SubDTaoBalanceMeta } from "./types"

const ROOT_NETUID = 0

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
  signal,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!miniMetadata?.data) {
    log.warn(`MiniMetadata is required for fetching ${MODULE_TYPE} balances on ${networkId}.`, {
      tokensWithAddresses,
    })
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error("Minimetadata is required for fetching balances"),
      })),
    }
  }
  if (miniMetadata.source !== MODULE_TYPE) {
    log.warn(`Ignoring miniMetadata with source ${miniMetadata.source} in ${MODULE_TYPE}.`)
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error(`Invalid request: miniMetadata source is not ${MODULE_TYPE}`),
      })),
    }
  }
  if (miniMetadata.chainId !== networkId) {
    log.warn(
      `Ignoring miniMetadata with chainId ${miniMetadata.chainId} in ${MODULE_TYPE}. Expected chainId is ${networkId}`
    )
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error(`Invalid request: Expected chainId is ${networkId}`),
      })),
    }
  }

  const addresses = uniq(balanceDefs.map((def) => def.address))

  try {
    // pre-parse once (memoized) — parsing the raw metadataRpc per call is expensive
    const { builder } = parseMetadataRpcCached(miniMetadata.data!)

    const stakeInfos = await fetchRuntimeCallResult<GetStakeInfosResult>(
      connector,
      networkId,
      builder,
      "StakeInfoRuntimeApi",
      "get_stake_info_for_coldkeys",
      [addresses]
    )

    const rootHotkeys = uniq(
      stakeInfos.flatMap(([, stakes]) =>
        stakes.filter((stake) => stake.netuid === ROOT_NETUID).map((stake) => stake.hotkey)
      )
    )
    const rootClaimableRatesByHotkey =
      rootHotkeys.length && miniMetadata.data
        ? await fetchRootClaimableRates(connector, networkId, miniMetadata.data, rootHotkeys)
        : new Map<string, Map<number, bigint>>()

    // Collect all (address, hotkey, netuid) pairs for root stakes to fetch RootClaimed amounts
    const addressHotkeyNetuidPairs: Array<[address: string, hotkey: string, netuid: number]> = []
    for (const [address, stakes] of stakeInfos) {
      for (const stake of stakes) {
        if (stake.netuid === ROOT_NETUID) {
          const claimableRates = rootClaimableRatesByHotkey.get(stake.hotkey)
          if (claimableRates) {
            // For each netuid that has a claimable rate, we need to check RootClaimed
            for (const netuid of claimableRates.keys()) {
              addressHotkeyNetuidPairs.push([address, stake.hotkey, netuid])
            }
          }
        }
      }
    }

    const [rootClaimedAmounts, convictionLocks] = await Promise.all([
      addressHotkeyNetuidPairs.length && miniMetadata.data
        ? fetchRootClaimedAmounts(connector, networkId, miniMetadata.data, addressHotkeyNetuidPairs)
        : Promise.resolve(new Map<string, Map<string, Map<number, bigint>>>()),
      miniMetadata.data
        ? fetchConvictionLocks(connector, networkId, miniMetadata.data, addresses)
        : Promise.resolve([]),
    ])

    // Upserts a balance into the accumulator, merging stake values if the balance already exists.
    // Eg: Acc X has root staked with validator Y, but also staked on sn 45 with the same validator Y.
    // We merge the pending root claim of sn 45 and the sn 45 stake in the same balance.
    const upsertBalance = (
      acc: Record<string, SubDTaoBalance>,
      address: string,
      tokenId: string,
      balance: SubDTaoBalance
    ): void => {
      const key = `${address}:${tokenId}`
      const recordedBalance = acc[key]
      if (recordedBalance) {
        acc[key] = {
          ...recordedBalance,
          stake: recordedBalance.stake + balance.stake,
          // If the new balance has pendingRootClaim, use it (it's calculated from current state)
          ...(balance.pendingRootClaim !== undefined && {
            pendingRootClaim: balance.pendingRootClaim,
          }),
          ...(balance.convictionLock !== undefined && {
            convictionLock: balance.convictionLock,
          }),
        }
      } else {
        acc[key] = balance
      }
    }

    // one shared slicer across all loops below: the nested stakes×hotkeys×netuids work is
    // time-sliced so it yields the thread on budget, and aborts when the poll unsubscribes
    const slicer = createTimeSlicer({ signal, label: `dtao fetchBalances ${networkId}` })

    const balancesRaw: Record<string, SubDTaoBalance> = {}
    for (const [address, stakes] of stakeInfos) {
      await forEachWithYield(
        stakes,
        (stake) => {
          // Regular stake cases
          const balance: SubDTaoBalance = {
            address,
            tokenId: subDTaoTokenId(networkId, stake.netuid, stake.hotkey),
            baseTokenId: subDTaoTokenId(networkId, stake.netuid),
            stake: stake.stake,
            hotkey: stake.hotkey,
            netuid: stake.netuid,
          }

          upsertBalance(balancesRaw, address, balance.tokenId, balance)

          // Root stake cases, we need to calculate the pending root claim and add to the balances
          if (stake.netuid === ROOT_NETUID) {
            const claimableRates = rootClaimableRatesByHotkey.get(stake.hotkey) ?? new Map()
            const alreadyClaimedMap =
              rootClaimedAmounts.get(address)?.get(stake.hotkey) ?? new Map<number, bigint>()

            const pendingRootClaimBalances = calculatePendingRootClaimable({
              stake: stake.stake,
              hotkey: stake.hotkey,
              address,
              networkId,
              validatorRootClaimableRate: claimableRates,
              alreadyClaimedByNetuid: alreadyClaimedMap,
            })
            pendingRootClaimBalances.forEach((balance) => {
              upsertBalance(balancesRaw, address, balance.tokenId, balance)
            })
          }
        },
        { slicer }
      )
    }

    await forEachWithYield(
      convictionLocks,
      ({ address, netuid, lock }) => {
        // A conviction lock constrains the coldkey's TOTAL alpha on the subnet (across all of its
        // hotkeys), not a specific staking position: report it on the subnet's base token (no hotkey).
        // It surfaces in the portfolio's locked column but does NOT reduce available/transferable
        // (the locked stake remains transferable via transfer_stake): staking/unstake flows cap
        // per-position amounts with the subnet-wide available-to-unstake amount instead.
        const balance: SubDTaoBalance = {
          address,
          tokenId: subDTaoTokenId(networkId, netuid),
          baseTokenId: subDTaoTokenId(networkId, netuid),
          stake: 0n,
          hotkey: lock.hotkey,
          netuid,
          convictionLock: lock,
        }

        upsertBalance(balancesRaw, address, balance.tokenId, balance)
      },
      { slicer }
    )

    const balances = Object.values(balancesRaw)

    const tokensById = keyBy(
      tokensWithAddresses.map(([token]) => token),
      (t) => t.id
    )
    const dynamicTokens: SubDTaoToken[] = []
    const requestedTokenIds = new Set(balanceDefs.map((def) => def.token.id))

    // identify tokens that were not requested but have balances
    // BalanceProvider will be register them in ChaindataProvider at runtime, so they will be requested on next call
    await forEachWithYield(
      balances,
      (bal) => {
        // base token balances (eg conviction locks) use the already-registered template token
        if (bal.tokenId === bal.baseTokenId) return
        if (!requestedTokenIds.has(bal.tokenId)) {
          const baseToken = tokensById[bal.baseTokenId] as SubDTaoToken | undefined
          // define a token specific to this staking hotkey
          if (baseToken) {
            const cleanToken = getCleanToken(baseToken) as SubDTaoToken
            const newToken = TokenSchema.parse({
              ...cleanToken,
              id: bal.tokenId,
              hotkey: bal.hotkey,
            }) as SubDTaoToken
            dynamicTokens.push(newToken)
          }
        }
      },
      { slicer }
    )

    const success: IBalance[] = (
      await mapWithYield(
        balanceDefs,
        (def): IBalance | null => {
          // balancesRaw is keyed `${address}:${tokenId}` — direct lookup instead of O(n) find
          const stake = balancesRaw[`${def.address}:${def.token.id}`]

          // do NOT fabricate zero balances for defs with no on-chain record: with the
          // full token list (all subnets × hotkeys × addresses) that meant building —
          // and running change-detection over — thousands of objects on every 6s poll
          // for downstream to discard. Absent balances are handled by the provider's
          // storage update (expected-but-missing ids are deleted), so a position
          // dropping to zero still disappears from the portfolio.
          if (!stake) return null

          const stakeAmount = BigInt(stake.stake?.toString() ?? "0")
          const pendingRootClaimAmount = BigInt(stake.pendingRootClaim?.toString() ?? "0")
          const convictionLockAmount = BigInt(stake.convictionLock?.amount?.toString() ?? "0")
          const convictionLockConviction = BigInt(stake.convictionLock?.convictionRaw ?? "0")
          const hasZeroStake = stakeAmount === 0n
          const hasPendingRootClaim = pendingRootClaimAmount > 0n

          const balanceValue: AmountWithLabel<string> = {
            type: "free",
            label: stake.netuid === 0 ? "Root Staking" : `Subnet Staking`,
            amount: stakeAmount.toString(),
          }

          const pendingRootClaimValue: AmountWithLabel<string> = {
            type: "locked",
            label: "Pending root claim",
            amount: pendingRootClaimAmount.toString(),
            // The pending claim is not part of the stake (free amount): on-chain it only becomes
            // stake once claimed (root_claim_on_subnet). Since it was never included in `free`,
            // it must not be subtracted from it either: flag it so it does not reduce the staked
            // position's transferable amount.
            includeInTransferable: true,
          }

          const values: Array<AmountWithLabel<string>> = [balanceValue, pendingRootClaimValue]
          // also surface zero-mass locks with residual conviction ("ghost" locks): the chain pins
          // future lock_stake calls to their hotkey, so the lock wizard must know they exist
          if (
            stake.convictionLock &&
            (convictionLockAmount > 0n || convictionLockConviction > 0n)
          ) {
            const convictionLockMeta: SubDTaoBalanceMeta = {
              convictionLock: {
                type: "conviction-lock",
                hotkey: stake.convictionLock.hotkey,
                lockType: stake.convictionLock.lockType,
              },
            }

            values.push({
              type: "locked",
              label: getConvictionLockLabel(stake.convictionLock.lockType),
              amount: convictionLockAmount.toString(),
              meta: convictionLockMeta,
            })
          }

          // If stake is 0n but there's a pendingRootClaim, add it as an extra amount
          // with includeInTotal: true so it counts toward the total balance.
          // This ensures the balance isn't filtered out when stake is 0n.
          // The total.planck calculation is: free + reserved + extra (with includeInTotal: true)
          // So by adding pendingRootClaim as extra, it will be included in total.planck.
          if (hasZeroStake && hasPendingRootClaim) {
            values.push({
              type: "extra",
              label: "Pending root claim",
              amount: pendingRootClaimAmount.toString(),
              includeInTotal: true,
            })
          }

          return {
            address: def.address,
            networkId,
            tokenId: def.token.id,
            source: MODULE_TYPE,
            status: "live",
            values,
          }
        },
        { slicer }
      )
    ).filter(isNotNil)

    return {
      success,
      errors: [],
      dynamicTokens,
    }
  } catch (err) {
    // cancellation (poll unsubscribed mid-decode) is not a fetch failure
    if (isAbortError(err)) throw err

    log.warn("Failed to fetch balances for substrate-dtao", { err })

    const errors = balanceDefs.map((def) => ({
      tokenId: def.token.id,
      address: def.address,
      error: new Error(`Failed to fetch balance for ${def.address} on ${networkId}`),
    }))

    return {
      success: [],
      errors,
    }
  }
}

const buildStorageCoder = (metadataRpc: `0x${string}`, pallet: string, entry: string) => {
  const { builder } = parseMetadataRpcCached(metadataRpc)
  return builder.buildStorage(pallet, entry)
}

const buildRootClaimableStorageCoder = async (
  _connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}` | null
): Promise<ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]> | null> => {
  let storageCoder: ReturnType<typeof buildStorageCoder> | null = null

  if (metadataRpc) {
    try {
      storageCoder = buildStorageCoder(metadataRpc, "SubtensorModule", "RootClaimable")
    } catch (cause) {
      log.warn(
        `Failed to build storage coder for SubtensorModule.RootClaimable using provided metadata on ${networkId}`,
        { cause }
      )
    }
  }

  return storageCoder
}

const buildRootClaimedStorageCoder = async (
  networkId: string,
  metadataRpc: `0x${string}` | null
): Promise<ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]> | null> => {
  let storageCoder: ReturnType<typeof buildStorageCoder> | null = null

  if (metadataRpc) {
    try {
      storageCoder = buildStorageCoder(metadataRpc, "SubtensorModule", "RootClaimed")
    } catch (cause) {
      log.warn(
        `Failed to build storage coder for SubtensorModule.RootClaimed using provided metadata on ${networkId}`,
        { cause }
      )
    }
  }

  return storageCoder
}

const buildRootClaimableQueries = (
  networkId: string,
  hotkeys: string[],
  storageCoder: ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]>
): Array<RpcQueryPack<[string, Map<number, bigint>]>> => {
  return hotkeys.map((hotkey) => {
    let stateKey: MaybeStateKey = null
    try {
      stateKey = storageCoder.keys.enc(hotkey) as MaybeStateKey
    } catch (cause) {
      log.warn(`Failed to encode storage key for hotkey ${hotkey} on ${networkId}`, { cause })
    }

    const decodeResult = (changes: MaybeStateKey[]): [string, Map<number, bigint>] => {
      const hexValue = changes[0]
      if (!hexValue) {
        return [hotkey, new Map<number, bigint>()]
      }

      const decoded = decodeScale<[number, bigint][] | null>(
        storageCoder,
        hexValue,
        `Failed to decode RootClaimable for hotkey ${hotkey} on ${networkId}`
      )
      // a present-but-undecodable value is a bad response, not an absent entry: an empty
      // map here would erase the hotkey's claim-only balances for this poll
      if (decoded === null)
        throw new Error(`Failed to decode RootClaimable for hotkey ${hotkey} on ${networkId}`)
      return [hotkey, new Map(decoded)]
    }

    return {
      stateKeys: [stateKey],
      decodeResult,
    }
  })
}

const fetchRootClaimableRates = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  hotkeys: string[]
): Promise<Map<string, Map<number, bigint>>> => {
  if (!hotkeys.length) return new Map<string, Map<number, bigint>>()

  const storageCoder = await buildRootClaimableStorageCoder(connector, networkId, metadataRpc)
  if (!storageCoder) {
    // Fallback: return empty map for all hotkeys
    return new Map(hotkeys.map((hotkey) => [hotkey, new Map<number, bigint>()]))
  }

  const queries = buildRootClaimableQueries(networkId, hotkeys, storageCoder)

  try {
    const results = await fetchRpcQueryPack(connector, networkId, queries)
    return new Map(results)
  } catch (cause) {
    // empty rates would make claim-only balances (zero direct stake) read as non-existent
    // for this poll — the provider would delete them and they'd flap back in on the next
    // one. Transient fetch failures must fail the poll (balances go stale) instead
    log.warn(`Failed to fetch RootClaimable for hotkeys on ${networkId}`, { cause })
    throw cause
  }
}

const buildRootClaimedQueries = (
  networkId: string,
  addressHotkeyNetuidPairs: Array<[address: string, hotkey: string, netuid: number]>,
  storageCoder: ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]>
): Array<RpcQueryPack<[string, string, number, bigint]>> => {
  return addressHotkeyNetuidPairs.map(([address, hotkey, netuid]) => {
    let stateKey: MaybeStateKey = null
    try {
      // RootClaimed storage takes params: [netuid, hotkey, coldkey_ss58]
      stateKey = storageCoder.keys.enc(netuid, hotkey, address) as MaybeStateKey
    } catch (cause) {
      log.warn(
        `Failed to encode storage key for RootClaimed (netuid=${netuid}, hotkey=${hotkey}, address=${address}) on ${networkId}`,
        { cause }
      )
    }

    const decodeResult = (changes: MaybeStateKey[]): [string, string, number, bigint] => {
      const hexValue = changes[0]
      if (!hexValue) {
        return [address, hotkey, netuid, 0n]
      }

      const decoded = decodeScale<bigint | null>(
        storageCoder,
        hexValue,
        `Failed to decode RootClaimed for (netuid=${netuid}, hotkey=${hotkey}, address=${address}) on ${networkId}`
      )
      // present-but-undecodable: claimed=0 would overstate the pending claim — fail the poll
      if (decoded === null)
        throw new Error(
          `Failed to decode RootClaimed for (netuid=${netuid}, hotkey=${hotkey}, address=${address}) on ${networkId}`
        )
      return [address, hotkey, netuid, decoded]
    }

    return {
      stateKeys: [stateKey],
      decodeResult,
    }
  })
}

const fetchRootClaimedAmounts = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  addressHotkeyNetuidPairs: Array<[address: string, hotkey: string, netuid: number]>
): Promise<Map<string, Map<string, Map<number, bigint>>>> => {
  if (!addressHotkeyNetuidPairs.length) {
    return new Map<string, Map<string, Map<number, bigint>>>()
  }

  const storageCoder = await buildRootClaimedStorageCoder(networkId, metadataRpc)
  if (!storageCoder) {
    // Fallback: return empty map for all pairs
    const result = new Map<string, Map<string, Map<number, bigint>>>()
    for (const [address, hotkey, netuid] of addressHotkeyNetuidPairs) {
      if (!result.has(address)) result.set(address, new Map())
      const addressMap = result.get(address)!
      if (!addressMap.has(hotkey)) addressMap.set(hotkey, new Map())
      addressMap.get(hotkey)!.set(netuid, 0n)
    }
    return result
  }

  const queries = buildRootClaimedQueries(networkId, addressHotkeyNetuidPairs, storageCoder)

  try {
    const results = await fetchRpcQueryPack(connector, networkId, queries)
    // Build a nested map: address -> hotkey -> netuid -> claimed amount
    const result = new Map<string, Map<string, Map<number, bigint>>>()
    for (const [address, hotkey, netuid, claimed] of results) {
      if (!result.has(address)) result.set(address, new Map())
      const addressMap = result.get(address)!
      if (!addressMap.has(hotkey)) addressMap.set(hotkey, new Map())
      addressMap.get(hotkey)!.set(netuid, claimed)
    }
    return result
  } catch (cause) {
    // claimed=0 fallback overstates every pending root claim for this poll (claimable
    // minus claimed) — transient fetch failures must fail the poll, not fabricate values
    log.warn(`Failed to fetch RootClaimed for address-hotkey-netuid pairs on ${networkId}`, {
      cause,
    })
    throw cause
  }
}

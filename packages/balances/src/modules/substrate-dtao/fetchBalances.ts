import {
  getCleanToken,
  type SubDTaoToken,
  subDTaoTokenId,
  TokenSchema,
} from "@talismn/chaindata-provider"
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
import { fetchBestBlockHash, fetchRuntimeCallResult } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"
import { getBalanceDefs } from "../shared/types"
import { CLAIMABLE_REWARDS_LABEL, fetchBasketClaims } from "./basketClaims"
import { MODULE_TYPE } from "./config"
import { fetchConvictionLocks, getConvictionLockLabel } from "./convictionLocks"
import { fetchRootStakeHolds } from "./rootStakeHold"
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

    // every read below is pinned to this block: stake, basket claims and hold windows are
    // combined with each other, and unpinned reads land on whatever block is best when they
    // arrive — mixing blocks reports state that never existed
    const at = await fetchBestBlockHash(connector, networkId)

    const stakeInfos = await fetchRuntimeCallResult<GetStakeInfosResult>(
      connector,
      networkId,
      builder,
      "StakeInfoRuntimeApi",
      "get_stake_info_for_coldkeys",
      [addresses],
      at
    )

    // unique (coldkey, hotkey) root staking pairs: hold windows are per pair. (Basket claims
    // discover their own pairs chain-side, including fully-unstaked validators.)
    const rootPairs: Array<{ address: string; hotkey: string }> = []
    const seenRootPairs = new Set<string>()
    for (const [address, stakes] of stakeInfos) {
      for (const stake of stakes) {
        if (stake.netuid !== ROOT_NETUID) continue
        const pairKey = `${address}:${stake.hotkey}`
        if (seenRootPairs.has(pairKey)) continue
        seenRootPairs.add(pairKey)
        rootPairs.push({ address, hotkey: stake.hotkey })
      }
    }

    const [convictionLocks, basketClaims, rootStakeHolds] = miniMetadata.data
      ? await Promise.all([
          fetchConvictionLocks(connector, networkId, miniMetadata.data, addresses, at),
          fetchBasketClaims(connector, networkId, miniMetadata.data, addresses, at),
          fetchRootStakeHolds(connector, networkId, miniMetadata.data, rootPairs, at),
        ])
      : [[], [], []]

    // Upserts a balance into the accumulator, merging stake values if the balance already exists.
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
          ...(balance.claimable !== undefined && { claimable: balance.claimable }),
          ...(balance.rootStakeHoldUnlockBlock !== undefined && {
            rootStakeHoldUnlockBlock: balance.rootStakeHoldUnlockBlock,
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
        },
        { slicer }
      )
    }

    await forEachWithYield(
      basketClaims,
      ({ address, hotkey, amount }) => {
        // claims ride on their validator's root staking position token, which the chain
        // keeps (and the claim redeems from) even after the coldkey fully unstaked from it
        const tokenId = subDTaoTokenId(networkId, ROOT_NETUID, hotkey)

        const balance: SubDTaoBalance = {
          address,
          tokenId,
          baseTokenId: subDTaoTokenId(networkId, ROOT_NETUID),
          stake: 0n,
          hotkey,
          netuid: ROOT_NETUID,
          claimable: amount,
        }

        upsertBalance(balancesRaw, address, tokenId, balance)
      },
      { slicer }
    )

    await forEachWithYield(
      rootStakeHolds,
      ({ address, hotkey, unlockAtBlock }) => {
        const tokenId = subDTaoTokenId(networkId, ROOT_NETUID, hotkey)

        const balance: SubDTaoBalance = {
          address,
          tokenId,
          baseTokenId: subDTaoTokenId(networkId, ROOT_NETUID),
          stake: 0n,
          hotkey,
          netuid: ROOT_NETUID,
          rootStakeHoldUnlockBlock: unlockAtBlock,
        }

        upsertBalance(balancesRaw, address, tokenId, balance)
      },
      { slicer }
    )

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
          const claimableAmount = BigInt(stake.claimable?.toString() ?? "0")
          const convictionLockAmount = BigInt(stake.convictionLock?.amount?.toString() ?? "0")
          const convictionLockConviction = BigInt(stake.convictionLock?.convictionRaw ?? "0")

          const rootStakeHoldMeta: SubDTaoBalanceMeta | undefined =
            stake.rootStakeHoldUnlockBlock !== undefined
              ? {
                  rootStakeHold: {
                    type: "root-stake-hold",
                    unlockAtBlock: stake.rootStakeHoldUnlockBlock,
                  },
                }
              : undefined

          const balanceValue: AmountWithLabel<string> = {
            type: "free",
            label: stake.netuid === ROOT_NETUID ? "Root Staking" : `Subnet Staking`,
            amount: stakeAmount.toString(),
            ...(rootStakeHoldMeta && { meta: rootStakeHoldMeta }),
          }

          const values: Array<AmountWithLabel<string>> = [balanceValue]

          if (claimableAmount > 0n) {
            // the claimable amount is not part of the stake (free amount): on-chain it only
            // becomes root stake once claimed. Surface it in the locked column without
            // reducing the position's transferable amount, and count it toward the total via
            // an extra (total.planck = free + reserved + extras with includeInTotal)
            values.push({
              type: "locked",
              label: CLAIMABLE_REWARDS_LABEL,
              amount: claimableAmount.toString(),
              includeInTransferable: true,
            })
            values.push({
              type: "extra",
              label: CLAIMABLE_REWARDS_LABEL,
              amount: claimableAmount.toString(),
              includeInTotal: true,
            })
          }
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

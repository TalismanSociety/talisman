import {
  type BitcoinAccountScan,
  type BitcoinHrp,
  type BitcoinTreeSpec,
  type BtcApi,
  refreshBitcoinAccountScan,
  scanBitcoinAccount,
} from "@talismn/bitcoin"
import type { BtcNetworkId } from "@talismn/chaindata-provider"
import { isBitcoinOnChainAddress, isBitcoinXpub } from "@talismn/crypto"

import type { Address, AmountWithLabel, IBalance } from "../../types"
import type {
  BtcAccountsMeta,
  FetchBalanceResults,
  IBalanceModule,
  TokensWithAddresses,
} from "../../types/IBalanceModule"
import { BalanceFetchError } from "../shared/errors"
import { getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"

const getBtcNetworkHrp = (networkId: BtcNetworkId): BitcoinHrp =>
  networkId === "bitcoin" ? "bc" : "tb"

const max0 = (value: bigint) => (value > 0n ? value : 0n)
const min0 = (value: bigint) => (value < 0n ? value : 0n)

export type PlainAddressSnapshot = { confirmedSats: bigint; mempoolDeltaSats: bigint }

export type BtcFetchState = {
  /** per xpub-identity account */
  scans: Record<Address, BitcoinAccountScan>
  /** per plain on-chain address (WIF accounts) */
  plain: Record<Address, PlainAddressSnapshot>
}

const getDefaultTrees = (address: Address): BitcoinTreeSpec[] => [
  // bare xpub without account metadata (plain watch-only): single payments tree
  { tree: "payments", xpub: address, addressType: "p2wpkh" },
]

const getAccountTrees = (address: Address, meta?: BtcAccountsMeta): BitcoinTreeSpec[] =>
  meta?.[address]?.trees?.length ? meta[address].trees : getDefaultTrees(address)

/**
 * Builds the balance values for one account.
 * Semantics (matching the Balance class): total = free + reserved, transferable = free − locks.
 * - free: confirmed funds net of outgoing mempool spends, across ALL trees
 * - locked "ordinals": the taproot-tree share of free — excluded from transferable
 * - reserved "pending": incoming mempool funds — counted in total, not transferable
 */
const buildValues = (
  amounts: Array<{ isOrdinals: boolean; confirmedSats: bigint; mempoolDeltaSats: bigint }>
): Array<AmountWithLabel<string>> => {
  let free = 0n
  let ordinalsLocked = 0n
  let pending = 0n

  for (const { isOrdinals, confirmedSats, mempoolDeltaSats } of amounts) {
    const netConfirmed = max0(confirmedSats + min0(mempoolDeltaSats))
    free += netConfirmed
    pending += max0(mempoolDeltaSats)
    if (isOrdinals) ordinalsLocked += netConfirmed
  }

  const values: Array<AmountWithLabel<string>> = [
    { type: "free", label: "free", amount: free.toString() },
  ]
  if (ordinalsLocked > 0n)
    values.push({
      type: "locked",
      label: "ordinals",
      amount: ordinalsLocked.toString(),
      meta: { tree: "ordinals" },
    })
  if (pending > 0n) values.push({ type: "reserved", label: "pending", amount: pending.toString() })

  return values
}

/**
 * Internal fetch used by both fetchBalances and subscribeBalances: also returns the
 * per-account scans so the subscription can warm-start subsequent polls.
 */
export const fetchBtcBalancesWithState = async ({
  networkId,
  tokensWithAddresses,
  api,
  meta,
  priorState,
}: {
  networkId: BtcNetworkId
  tokensWithAddresses: TokensWithAddresses
  api: BtcApi
  meta?: BtcAccountsMeta
  /** state from a previous fetch: enables a cheap incremental refresh instead of a full gap scan */
  priorState?: BtcFetchState
}): Promise<{ results: FetchBalanceResults; state: BtcFetchState }> => {
  const hrp = getBtcNetworkHrp(networkId)

  for (const [token, addresses] of tokensWithAddresses) {
    if (token.type !== MODULE_TYPE || token.networkId !== networkId)
      throw new Error(
        `Invalid token type or networkId for balance module: ${token.type} on ${token.networkId}`
      )

    for (const address of addresses)
      if (!isBitcoinXpub(address) && !isBitcoinOnChainAddress(address))
        throw new Error(
          `Invalid bitcoin address for balance module: ${address} for token ${token.id}`
        )
  }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)
  const state: BtcFetchState = { scans: {}, plain: {} }

  const settled = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }): Promise<IBalance> => {
      try {
        let values: Array<AmountWithLabel<string>>

        if (isBitcoinXpub(address)) {
          const priorScan = priorState?.scans[address]
          // incremental refresh once we have a prior scan; full gap scan for cold discovery
          const scan = priorScan
            ? await refreshBitcoinAccountScan(api, priorScan, hrp)
            : await scanBitcoinAccount(api, { trees: getAccountTrees(address, meta), hrp })
          state.scans[address] = scan
          values = buildValues(
            scan.trees.map((tree) => ({
              isOrdinals: tree.spec.tree === "ordinals",
              confirmedSats: tree.confirmedSats,
              mempoolDeltaSats: tree.mempoolDeltaSats,
            }))
          )
        } else {
          const stats = await api.getAddressStats(address)
          const confirmedSats =
            BigInt(stats.chain_stats.funded_txo_sum) - BigInt(stats.chain_stats.spent_txo_sum)
          const mempoolDeltaSats =
            BigInt(stats.mempool_stats.funded_txo_sum) - BigInt(stats.mempool_stats.spent_txo_sum)
          state.plain[address] = { confirmedSats, mempoolDeltaSats }
          values = buildValues([{ isOrdinals: false, confirmedSats, mempoolDeltaSats }])
        }

        return {
          address,
          tokenId: token.id,
          values,
          source: MODULE_TYPE,
          networkId: token.networkId,
          status: "live",
          // transferable = free − ordinals lock; the new calculation would let pending
          // (reserved) offset the lock, which makes no sense for bitcoin
          useLegacyTransferableCalculation: true,
        }
      } catch (err) {
        throw new BalanceFetchError(
          `Failed to get balance for token ${token.id} and address ${address} on chain ${networkId}`,
          token.id,
          address,
          err as Error
        )
      }
    })
  )

  const results = settled.reduce<FetchBalanceResults>(
    (acc, result) => {
      if (result.status === "fulfilled") acc.success.push(result.value as IBalance)
      else {
        const error = result.reason as BalanceFetchError
        acc.errors.push({ tokenId: error.tokenId, address: error.address, error })
      }
      return acc
    },
    { success: [], errors: [] }
  )

  return { results, state }
}

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
  meta,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const api = await connector.getApi(networkId)
  if (!api) throw new Error(`Could not get esplora api for btc network ${networkId}`)

  const { results } = await fetchBtcBalancesWithState({
    networkId,
    tokensWithAddresses,
    api,
    meta,
  })
  return results
}

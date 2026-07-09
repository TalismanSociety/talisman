import { HDKey } from "@scure/bip32"
import { deriveBitcoinAddressFromXpub, normalizeXpub } from "@talismn/crypto"

import { BITCOIN_GAP_LIMIT, SCAN_BATCH_SIZE } from "../constants"
import type { BtcApi, EsploraAddressStats } from "../esplora/types"
import type {
  BitcoinAccountScan,
  BitcoinHrp,
  BitcoinTreeScan,
  BitcoinTreeSpec,
  BitcoinUtxo,
  ScanCursor,
  TreeChainScan,
} from "../types"

const statsToBalances = (stats: EsploraAddressStats) => ({
  confirmedSats: BigInt(stats.chain_stats.funded_txo_sum) - BigInt(stats.chain_stats.spent_txo_sum),
  mempoolDeltaSats:
    BigInt(stats.mempool_stats.funded_txo_sum) - BigInt(stats.mempool_stats.spent_txo_sum),
  txCount: stats.chain_stats.tx_count + stats.mempool_stats.tx_count,
})

const scanChain = async (
  api: BtcApi,
  spec: BitcoinTreeSpec,
  change: 0 | 1,
  hrp: BitcoinHrp,
  gapLimit: number,
  warmStartUsedCount: number
): Promise<TreeChainScan> => {
  const activeAddresses: TreeChainScan["activeAddresses"] = []
  let lastUsedIndex = -1
  let upper = warmStartUsedCount + gapLimit
  let index = 0

  while (index < upper) {
    const batchIndices: number[] = []
    for (let i = index; i < Math.min(index + SCAN_BATCH_SIZE, upper); i++) batchIndices.push(i)

    const results = await Promise.all(
      batchIndices.map(async (i) => {
        const address = deriveBitcoinAddressFromXpub(spec.xpub, spec.addressType, change, i, hrp)
        const stats = await api.getAddressStats(address)
        return { index: i, address, ...statsToBalances(stats) }
      })
    )

    for (const result of results) {
      if (result.txCount > 0) {
        lastUsedIndex = Math.max(lastUsedIndex, result.index)
        // extend the horizon: gap counts from the last used address
        upper = Math.max(upper, lastUsedIndex + 1 + gapLimit)
      }
      if (result.txCount > 0 || result.confirmedSats !== 0n || result.mempoolDeltaSats !== 0n)
        activeAddresses.push(result)
    }

    index += batchIndices.length
  }

  return {
    usedCount: lastUsedIndex + 1,
    firstUnusedIndex: lastUsedIndex + 1,
    activeAddresses: activeAddresses.sort((a, b) => a.index - b.index),
  }
}

export const getScanCursorKey = (spec: BitcoinTreeSpec) => `${spec.tree}:${spec.addressType}`

export const scanBitcoinAccount = async (
  api: BtcApi,
  args: {
    trees: BitcoinTreeSpec[]
    hrp: BitcoinHrp
    gapLimit?: number
    warmStart?: ScanCursor
  }
): Promise<BitcoinAccountScan> => {
  const gapLimit = args.gapLimit ?? BITCOIN_GAP_LIMIT

  const [tipHeight, ...trees] = await Promise.all([
    api.getTipHeight(),
    ...args.trees.map(async (spec): Promise<BitcoinTreeScan> => {
      const warm = args.warmStart?.[getScanCursorKey(spec)] ?? [0, 0]
      const [external, internal] = await Promise.all([
        scanChain(api, spec, 0, args.hrp, gapLimit, warm[0]),
        scanChain(api, spec, 1, args.hrp, gapLimit, warm[1]),
      ])
      const sum = (fn: (a: TreeChainScan["activeAddresses"][number]) => bigint) =>
        [...external.activeAddresses, ...internal.activeAddresses].reduce(
          (acc, a) => acc + fn(a),
          0n
        )
      return {
        spec,
        chains: [external, internal],
        confirmedSats: sum((a) => a.confirmedSats),
        mempoolDeltaSats: sum((a) => a.mempoolDeltaSats),
      }
    }),
  ])

  return { trees, tipHeight }
}

export const getScanCursor = (scan: BitcoinAccountScan): ScanCursor =>
  Object.fromEntries(
    scan.trees.map((tree) => [
      getScanCursorKey(tree.spec),
      [tree.chains[0].usedCount, tree.chains[1].usedCount] as [number, number],
    ])
  )

/**
 * Fetches the spendable UTXO set for a scanned account.
 * Only called at send time — balance polling relies on address stats alone.
 */
export const getSpendableUtxos = async (
  api: BtcApi,
  scan: BitcoinAccountScan,
  opts?: { minConfirmations?: number }
): Promise<BitcoinUtxo[]> => {
  const minConfirmations = opts?.minConfirmations ?? 0
  const utxos: BitcoinUtxo[] = []

  for (const tree of scan.trees) {
    // derive account node once per tree, children per active address
    const accountKey = HDKey.fromExtendedKey(normalizeXpub(tree.spec.xpub))

    for (const change of [0, 1] as const) {
      const chain = tree.chains[change]
      const funded = chain.activeAddresses.filter(
        (a) => a.confirmedSats > 0n || a.mempoolDeltaSats > 0n
      )

      const results = await Promise.all(
        funded.map(async ({ index, address }) => {
          const publicKey = accountKey.deriveChild(change).deriveChild(index).publicKey
          if (!publicKey) throw new Error("Unable to derive public key")
          const addressUtxos = await api.getAddressUtxos(address)
          return addressUtxos.map(
            (utxo): BitcoinUtxo => ({
              txid: utxo.txid,
              vout: utxo.vout,
              valueSats: BigInt(utxo.value),
              confirmations: utxo.status.block_height
                ? scan.tipHeight - utxo.status.block_height + 1
                : 0,
              address,
              addressType: tree.spec.addressType,
              tree: tree.spec.tree,
              change,
              index,
              publicKey,
            })
          )
        })
      )

      utxos.push(...results.flat().filter((utxo) => utxo.confirmations >= minConfirmations))
    }
  }

  return utxos
}

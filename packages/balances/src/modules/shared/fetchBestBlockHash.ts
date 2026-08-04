import type { IChainConnectorDot } from "@talismn/chain-connectors"

/**
 * Hash of the current best block, to pin a poll's reads to.
 *
 * Chain state moves between the round-trips of a multi-call poll, and unpinned reads each
 * run against whatever block is best when they land. Combining values read at different
 * blocks fabricates data (eg a dtao basket claim total read one block after its
 * per-validator breakdown leaves an unattributed remainder).
 */
export const fetchBestBlockHash = async (
  connector: IChainConnectorDot,
  networkId: string
): Promise<`0x${string}`> => {
  const blockHash = await connector.send<`0x${string}` | null>(networkId, "chain_getBlockHash", [])
  if (!blockHash) throw new Error(`Failed to fetch best block hash on ${networkId}`)
  return blockHash
}

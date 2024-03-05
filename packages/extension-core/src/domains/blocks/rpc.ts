import { Block } from "@polkadot/types/interfaces"

import { chainConnector } from "../../rpcs/chain-connector"
import { getTypeRegistry } from "../../util/getTypeRegistry"
import { ChainId } from "../chains/types"

export default class BlocksRpc {
  /**
   * Fetch a block from a chain by chainId and optional blockNumber.
   *
   * @param chainId - The chain to query.
   * @param block - The block number or hash to query.
   * @returns The fetched block.
   */
  static async block(chainId: ChainId, block?: string | number): Promise<Block> {
    const blockHash = await this.blockHash(chainId, block)

    // set up method and params
    const method = "chain_getBlock"
    const params = [blockHash].filter(Boolean)

    // query rpc
    const response = await chainConnector.send(chainId, method, params)

    // get block from response
    const blockFrame = response.block

    // decode block
    const blockDecoded = (await getTypeRegistry(chainId)).registry.createType<Block>(
      "Block",
      blockFrame
    )

    return blockDecoded
  }

  /**
   * Fetch a blockHash from a chain by chainId and blockNumber.
   *
   * @param chainId - The chain to query.
   * @param block - The block number or hash to query.
   * @returns The fetched blockhash.
   */
  static async blockHash(chainId: ChainId, block: undefined): Promise<undefined>
  static async blockHash(chainId: ChainId, block: string | number): Promise<string>
  static async blockHash(
    chainId: ChainId,
    block: string | number | undefined
  ): Promise<string | undefined>
  static async blockHash(
    chainId: ChainId,
    block: string | number | undefined
  ): Promise<string | undefined> {
    if (typeof block === "undefined") return
    if (typeof block === "string") return block
    return await chainConnector.send(chainId, "chain_getBlockHash", [block])
  }
}

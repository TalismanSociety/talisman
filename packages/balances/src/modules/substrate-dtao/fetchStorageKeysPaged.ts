import type { IChainConnectorDot } from "@talismn/chain-connectors"

const PAGE_SIZE = 1000

/**
 * Prefix scan via state_getKeysPaged. The unpaged state_getKeys is classified as heavy storage
 * work and rejected by some public nodes (eg the bittensor testnet one: "Storage work rate limit
 * exceeded"), while the paged variant is universally allowed.
 */
export const fetchStorageKeysPaged = async (
  connector: IChainConnectorDot,
  networkId: string,
  keyPrefix: string
): Promise<`0x${string}`[]> => {
  const keys: `0x${string}`[] = []
  let startKey: `0x${string}` | undefined
  do {
    const page = await connector.send<`0x${string}`[]>(
      networkId,
      "state_getKeysPaged",
      startKey ? [keyPrefix, PAGE_SIZE, startKey] : [keyPrefix, PAGE_SIZE]
    )
    keys.push(...page)
    startKey = page.length === PAGE_SIZE ? page[page.length - 1] : undefined
  } while (startKey)
  return keys
}

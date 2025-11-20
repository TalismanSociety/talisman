import { IChainConnectorDot } from "@talismn/chain-connectors"
import { parseMetadataRpc } from "@talismn/scale"

import log from "../../log"

const buildStorageCoder = (metadataRpc: `0x${string}`, pallet: string, entry: string) => {
  const { builder } = parseMetadataRpc(metadataRpc)
  return builder.buildStorage(pallet, entry)
}

export const fetchStorageValue = async <T>(
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}` | null,
  pallet: string,
  entry: string,
  keys: unknown[],
  at?: string,
): Promise<T | null> => {
  let storageCoder: ReturnType<typeof buildStorageCoder> | null = null

  if (metadataRpc) {
    try {
      storageCoder = buildStorageCoder(metadataRpc, pallet, entry) // TODO: This is failing, double check mini metadata. Perhaps add extraKeepTypes?
    } catch (cause) {
      log.warn(
        `Failed to build storage coder for ${pallet}.${entry} using provided metadata on ${networkId}`,
        { cause },
      )
    }
  }

  if (!storageCoder) {
    try {
      const fullMetadataRpc = await connector.send<`0x${string}`>(
        networkId,
        "state_getMetadata",
        [],
      )
      storageCoder = buildStorageCoder(fullMetadataRpc, pallet, entry)
    } catch (cause) {
      log.warn(`Failed to build storage coder for ${pallet}.${entry} from chain metadata`, {
        networkId,
        cause,
      })
      return null
    }
  }

  const storageKey = storageCoder.keys.enc(...keys)
  const params = at ? [storageKey, at] : [storageKey]
  const hexValue = await connector.send<string | null>(networkId, "state_getStorage", params)
  if (!hexValue) {
    log.warn(`Failed to fetch storage value for ${pallet}.${entry} on ${networkId}`, {
      keys,
    })
    return null
  }

  return storageCoder.value.dec(hexValue) as T
}

import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import type { NetworkId } from "@talismn/chaindata-provider"
import { getErrorMessage } from "@talismn/util"
import type { Hex } from "viem"

/** a node that already holds the bytes, or saw them land, is not refusing them */
const BROADCAST_NOISE = ["already known", "already imported", "nonce too low"]

const isBroadcastNoise = (err: unknown) => {
  const message = getErrorMessage(err).toLowerCase()
  return BROADCAST_NOISE.some((noise) => message.includes(noise))
}

/** Sends signed bytes. Resending the same bytes is safe: the hash does not change */
export const broadcastRaw = async (networkId: NetworkId, raw: Hex) => {
  const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
  if (!client) throw new Error(`No client for network ${networkId}`)
  try {
    await client.sendRawTransaction({ serializedTransaction: raw })
  } catch (err) {
    if (!isBroadcastNoise(err)) throw err
  }
}

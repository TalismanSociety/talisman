import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import type { NetworkId } from "@talismn/chaindata-provider"
import { getErrorMessage } from "@talismn/util"
import { type Hex, keccak256 } from "viem"

/** a node that already holds the bytes, or saw them land, is not refusing them */
const BROADCAST_NOISE = ["already known", "already imported", "nonce too low"]

const isBroadcastNoise = (err: unknown) => {
  const message = getErrorMessage(err).toLowerCase()
  return BROADCAST_NOISE.some((noise) => message.includes(noise))
}

/**
 * Sends fresh signed bytes. A node refuses other bytes on their nonce as "already known" too, so
 * only a node that does not hold these bytes afterwards refused them.
 */
export const sendRaw = async (networkId: NetworkId, raw: Hex) => {
  const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
  if (!client) throw new Error(`No client for network ${networkId}`)
  try {
    await client.sendRawTransaction({ serializedTransaction: raw })
  } catch (err) {
    const isHeld = await client.getTransaction({ hash: keccak256(raw) }).then(Boolean, () => false)
    if (!isHeld) throw err
  }
}

/** Sends signed bytes. Resending the same bytes is safe: the hash does not change */
export const broadcastRaw = async (networkId: NetworkId, raw: Hex) => {
  try {
    await sendRaw(networkId, raw)
  } catch (err) {
    if (!isBroadcastNoise(err)) throw err
  }
}

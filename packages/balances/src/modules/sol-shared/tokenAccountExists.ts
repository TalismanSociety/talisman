import type { Address } from "@solana/kit"
import type { SolRpc } from "@talismn/chain-connectors"

/**
 * Checks whether an associated token account already exists for the given token program.
 *
 * encoding must be explicit: the node rejects base58 (its default) for account data >128 bytes,
 * and the owner check is enough — skip the data entirely. An account not owned by the token
 * program (e.g. a rent-dusted system account squatting the ATA address) must go through the
 * create instruction, which handles pre-funded addresses; a bare transfer to it fails on-chain.
 */
export const tokenAccountExists = async (rpc: SolRpc, address: Address, tokenProgram: Address) => {
  const { value } = await rpc
    .getAccountInfo(address, { encoding: "base64", dataSlice: { offset: 0, length: 0 } })
    .send()
  return value !== null && value.owner === tokenProgram
}

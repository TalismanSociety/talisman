import {
  getCleanToken,
  type SubDTaoToken,
  subDTaoTokenId,
  TokenSchema,
} from "@talismn/chaindata-provider"

/**
 * The token of a stake on a subnet with one validator: the subnet's own token, named after the
 * validator's hotkey. The balances module registers one when it finds a stake; this builds the
 * same token for a validator the user holds nothing with yet.
 */
export const buildDTaoPositionToken = (subnet: SubDTaoToken, hotkey: string): SubDTaoToken =>
  TokenSchema.parse({
    ...getCleanToken(subnet),
    id: subDTaoTokenId(subnet.networkId, subnet.netuid, hotkey),
    hotkey,
  }) as SubDTaoToken

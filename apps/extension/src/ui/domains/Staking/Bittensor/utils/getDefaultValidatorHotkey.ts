import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import type { Balances } from "@talismn/balances"
import type { NetworkId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"

type RemoteConfig = {
  bittensor: {
    defaultValidatorsBySubnet: Record<string, string>
  }
}

/**
 * Picks the default validator hotkey for a subnet.
 *
 * If the user has existing substrate-dtao stake balances on this network and subnet,
 * returns the hotkey with the largest balance.
 * Otherwise falls back to the remote-config default for the subnet, on mainnet only:
 * remote-config hotkeys don't exist on testnet.
 */
export const getDefaultValidatorHotkey = (
  networkId: NetworkId,
  netuid: number,
  remoteConfig: RemoteConfig,
  balances?: Balances,
  address?: string | null
): string | undefined => {
  const dtaoBalances =
    balances?.each
      .map((bal) => {
        const token = bal.token
        if (token?.type !== "substrate-dtao") return null
        if (token.networkId !== networkId) return null
        if (token.netuid !== netuid) return null
        if (!token.hotkey) return null
        if (!bal.free.planck) return null
        if (address && bal.address !== address) return null
        return { hotkey: token.hotkey, free: bal.free.planck }
      })
      .filter(isNotNil)
      .sort((a, b) => (b.free > a.free ? 1 : -1)) ?? []

  if (dtaoBalances.length > 0) return dtaoBalances[0].hotkey

  if (networkId !== BITTENSOR_NETWORK_ID) return undefined

  return remoteConfig.bittensor.defaultValidatorsBySubnet[netuid] ?? undefined
}

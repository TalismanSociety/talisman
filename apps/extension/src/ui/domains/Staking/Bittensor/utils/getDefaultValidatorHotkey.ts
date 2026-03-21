import type { Balances } from "@talismn/balances"
import { isNotNil } from "@talismn/util"

type RemoteConfig = {
  bittensor: {
    defaultValidatorsBySubnet: Record<string, string>
  }
}

/**
 * Picks the default validator hotkey for a subnet.
 *
 * If the user has existing substrate-dtao stake balances on this subnet,
 * returns the hotkey with the largest balance.
 * Otherwise falls back to the remote-config default for the subnet.
 */
export const getDefaultValidatorHotkey = (
  netuid: number,
  balances: Balances,
  remoteConfig: RemoteConfig
): string | undefined => {
  const dtaoBalances = balances.each
    .map((bal) => {
      const token = bal.token
      if (token?.type !== "substrate-dtao") return null
      if (token.netuid !== netuid) return null
      if (!token.hotkey) return null
      if (!bal.free.planck) return null
      return { hotkey: token.hotkey, free: bal.free.planck }
    })
    .filter(isNotNil)
    .sort((a, b) => (b.free > a.free ? 1 : -1))

  if (dtaoBalances.length > 0) return dtaoBalances[0].hotkey

  return remoteConfig.bittensor.defaultValidatorsBySubnet[netuid] ?? undefined
}

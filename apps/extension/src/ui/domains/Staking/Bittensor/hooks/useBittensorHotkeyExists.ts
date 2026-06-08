import { isAddressCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { isSs58Address } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useDotNetwork } from "@ui/state/chaindata"

export type HotkeyExistsStatus = "empty" | "invalid-format" | "checking" | "not-found" | "exists"

/**
 * Validates a pasted hotkey for use as a conviction-lock target: first the ss58 format, then
 * on-chain existence.
 *
 * The chain's `lock_stake` only requires the hotkey to be a registered account (the
 * `HotKeyAccountNotExists` guard), which maps to a non-empty `SubtensorModule.Owner` entry — NOT
 * membership of this specific subnet. So we read the global hotkey→coldkey `Owner` map rather than
 * a subnet-scoped index, which lets a valid off-subnet hotkey resolve as a usable target.
 */
export const useBittensorHotkeyExists = (
  networkId: DotNetworkId | null | undefined,
  hotkey: string | null | undefined
) => {
  const network = useDotNetwork(networkId)
  const { data: sapi } = useScaleApi(networkId)

  const isFormatValid =
    !!hotkey &&
    isSs58Address(hotkey) &&
    (!network || isAddressCompatibleWithNetwork(network, hotkey))

  const query = useQuery({
    queryKey: ["bittensorHotkeyExists", sapi?.id, hotkey],
    queryFn: async () => {
      if (!sapi || !hotkey) throw new Error("sapi not available")
      // Owner maps hotkey → owning coldkey; absent key returns null (the HotKeyAccountNotExists case)
      const coldkey = await sapi.getStorage<string | null>("SubtensorModule", "Owner", [hotkey])
      return { exists: coldkey != null, coldkey: coldkey ?? null }
    },
    enabled: !!sapi && isFormatValid,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const status: HotkeyExistsStatus = !hotkey
    ? "empty"
    : !isFormatValid
      ? "invalid-format"
      : query.isLoading
        ? "checking"
        : query.data?.exists
          ? "exists"
          : "not-found"

  return {
    status,
    isFormatValid,
    exists: query.data?.exists ?? false,
    coldkey: query.data?.coldkey ?? null,
  }
}

import { isAddressCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { isSs58Address } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useDotNetwork } from "@ui/state/chaindata"
import { Binary } from "polkadot-api"

import { cleanName } from "../utils/subnetNeurons"

export type HotkeyExistsStatus =
  | "empty"
  | "invalid-format"
  | "checking"
  | "error"
  | "not-found"
  | "exists"

/**
 * Resolves a pasted hotkey for use as a conviction-lock target: first the ss58 format, then on-chain
 * existence, and — when it exists — its display name.
 *
 * The chain's `lock_stake` only requires the hotkey to be a registered account (the
 * `HotKeyAccountNotExists` guard), which maps to a non-empty `SubtensorModule.Owner` entry — NOT
 * membership of this specific subnet. So we read the global hotkey→coldkey `Owner` map rather than a
 * subnet-scoped index, which lets a valid off-subnet hotkey resolve as a usable target.
 *
 * The on-chain identity (`SubtensorModule.IdentitiesV2`) is keyed by COLDKEY, so we resolve the name
 * via the owning coldkey returned by `Owner` — this is the same source the metagraph bakes into each
 * neuron's identity, so an off-subnet hotkey shows the same name an on-subnet one would.
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
      if (coldkey == null) return { exists: false, coldkey: null, name: null }

      // resolve the coldkey's on-chain identity name (best-effort; absent or undecodable → null)
      let name: string | null = null
      try {
        const identity = await sapi.getStorage<{ name: Uint8Array } | null>(
          "SubtensorModule",
          "IdentitiesV2",
          [coldkey]
        )
        const identityName = identity?.name
        name = cleanName(identityName ? Binary.toText(identityName) : undefined)
      } catch {
        name = null
      }

      return { exists: true, coldkey, name }
    },
    enabled: !!sapi && isFormatValid,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // isPending (not isLoading): isLoading is false while the query is *disabled* (sapi still
  // loading), which would report a possibly-registered hotkey as "not-found". isPending stays true
  // until the first successful fetch. Fetch errors get their own status — "not-found" is an
  // on-chain fact, not a fallback.
  const status: HotkeyExistsStatus = !hotkey
    ? "empty"
    : !isFormatValid
      ? "invalid-format"
      : query.isError
        ? "error"
        : query.isPending
          ? "checking"
          : query.data?.exists
            ? "exists"
            : "not-found"

  return {
    status,
    isFormatValid,
    exists: query.data?.exists ?? false,
    coldkey: query.data?.coldkey ?? null,
    name: query.data?.name ?? null,
  }
}

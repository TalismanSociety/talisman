import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

const U64F64_FRACTIONAL_BITS = 64n

/**
 * Total conviction currently locked TO a hotkey on a subnet, aggregated across ALL coldkeys (any
 * wallet) — the chain's public commitment signal.
 *
 * Read via `StakeInfoRuntimeApi.get_hotkey_conviction`, which rolls the decaying locks forward for
 * us. The raw value is U64F64 fixed-point; shifting off the 64 fractional bits yields a planck
 * amount in the subnet's alpha (same units as the displayed stake). There is no bulk variant, so
 * this is called per hotkey — it fires lazily as picker rows render and is cached by react-query.
 */
export const useBittensorHotkeyConviction = (
  networkId: DotNetworkId | null | undefined,
  netuid: number | null | undefined,
  hotkey: string | null | undefined
) => {
  const { data: sapi } = useScaleApi(networkId)

  const query = useQuery({
    queryKey: ["bittensorHotkeyConviction", networkId, netuid, hotkey, sapi?.id],
    queryFn: async () => {
      if (!sapi || !hotkey || typeof netuid !== "number") throw new Error("sapi not available")
      if (!sapi.isApiAvailable("StakeInfoRuntimeApi", "get_hotkey_conviction")) return 0n
      const raw = await sapi.getRuntimeCallValue<bigint>(
        "StakeInfoRuntimeApi",
        "get_hotkey_conviction",
        [hotkey, netuid]
      )
      return typeof raw === "bigint" ? raw >> U64F64_FRACTIONAL_BITS : 0n
    },
    enabled: !!sapi && !!hotkey && typeof netuid === "number",
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnWindowFocus: false,
  })

  return { conviction: query.data ?? null, isLoading: query.isLoading }
}

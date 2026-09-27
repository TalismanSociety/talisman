import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type UseGetBittensorTransferableBalanceInputs = {
  networkId: DotNetworkId | null | undefined
  address: string | null | undefined
}

/**
 * Reads the account's transferable TAO straight from chain via `System.Account`.
 *
 * The balance pool drops zero balances, so a missing pool record is ambiguous: it can mean
 * "zero TAO" as well as "not loaded yet". Unstake fee checks need the distinction to show
 * the insufficient-fee error only once the actual balance is known.
 */
export const useGetBittensorTransferableBalance = ({
  networkId,
  address,
}: UseGetBittensorTransferableBalanceInputs) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorTransferableBalance", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null

      const account = await sapi.getStorage<{ data?: { free?: bigint; frozen?: bigint } }>(
        "System",
        "Account",
        [address]
      )

      const free = account?.data?.free ?? 0n
      const frozen = account?.data?.frozen ?? 0n
      return free > frozen ? free - frozen : 0n
    },
    enabled: !!sapi && !!address,
    refetchInterval: 6_000,
  })
}

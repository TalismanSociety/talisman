import { useMutation } from "@tanstack/react-query"

import { useAppState } from "@ui/state"

export const useUpsertBittensorUnbondBlockNumber = () => {
  const [_, setUnbondBlockNumber] = useAppState("bittensorUnbondBlockNumber")
  return useMutation({
    mutationFn: async ({
      account,
      delegator,
      blockNumber,
    }: {
      account: string | undefined | null
      delegator: string | number | undefined | null
      blockNumber: number
    }) => {
      if (!account || !delegator || !blockNumber) return
      setUnbondBlockNumber((prev) => {
        return {
          ...prev,
          [account]: {
            ...prev[account],
            [delegator]: blockNumber,
          },
        }
      })
    },
  })
}

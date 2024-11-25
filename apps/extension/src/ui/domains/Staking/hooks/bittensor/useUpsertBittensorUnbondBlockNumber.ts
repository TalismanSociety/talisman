import { useMutation } from "@tanstack/react-query"
import { bittensorUnbondBlockNumberStore } from "extension-core"

export const useUpsertBittensorUnbondBlockNumber = () => {
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
      const info = await bittensorUnbondBlockNumberStore.get(account)
      bittensorUnbondBlockNumberStore.set({ [account]: { ...info, [delegator]: blockNumber } })
    },
  })
}

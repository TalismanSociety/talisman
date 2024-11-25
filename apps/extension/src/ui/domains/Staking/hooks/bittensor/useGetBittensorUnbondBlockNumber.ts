import { useQuery } from "@tanstack/react-query"
import { bittensorUnbondBlockNumberStore } from "extension-core"

const fetchBittensorUnbondBlockNumber = async ({
  address,
  delegator,
}: GetBittensorUnbondBlockNumber) => {
  if (!address || !delegator) return null
  const response = await bittensorUnbondBlockNumberStore.get(address)
  return response?.[delegator]
}

type GetBittensorUnbondBlockNumber = {
  address: string | null | undefined
  delegator: string | number | null | undefined
}

export const useGetBittensorUnbondBlockNumber = ({
  address,
  delegator,
}: GetBittensorUnbondBlockNumber) => {
  return useQuery({
    queryKey: ["useGetBittensorUnbondBlockNumber", address, delegator],
    queryFn: async () => fetchBittensorUnbondBlockNumber({ address, delegator }),
    enabled: !!address && !!delegator,
  })
}

import { useQuery } from "@tanstack/react-query"

import { useAppStateValue } from "@ui/state"

type GetBittensorUnbondBlockNumber = {
  address: string | null | undefined
  delegator: string | number | null | undefined
}

export const useGetBittensorUnbondBlockNumber = ({
  address,
  delegator,
}: GetBittensorUnbondBlockNumber) => {
  const unbondBlockNumber = useAppStateValue("bittensorUnbondBlockNumber")
  return useQuery({
    queryKey: ["useGetBittensorUnbondBlockNumber", address, delegator],
    queryFn: () =>
      address && delegator && unbondBlockNumber[address]
        ? unbondBlockNumber[address]?.[delegator]
        : undefined,
    enabled: !!address && !!delegator,
  })
}

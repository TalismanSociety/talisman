import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

type GetLatestBlockNumber = {
  sapi: ScaleApi | undefined | null
  isEnabled: boolean
}

export const useGetLatestBlockNumber = ({ sapi, isEnabled }: GetLatestBlockNumber) => {
  return useQuery({
    queryKey: ["useGetLatestBlockNumber", sapi?.id],
    queryFn: async () => {
      return sapi?.getStorage<number>("System", "Number", [])
    },
    enabled: isEnabled && !!sapi,
  })
}

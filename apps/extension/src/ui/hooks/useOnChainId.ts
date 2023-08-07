import { readOnChainIds, useFetchOnChainIdsForAddresses } from "@ui/atoms/onChainIds"
import { useRecoilValue } from "recoil"

export const useOnChainId = (address?: string) => {
  // add address to global list of addresses we want to query
  useFetchOnChainIdsForAddresses(address)

  // retrieve result of global addresses query for this address
  const onChainId = useRecoilValue(readOnChainIds(address))
  return onChainId
}

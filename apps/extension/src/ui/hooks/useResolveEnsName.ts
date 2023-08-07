import { isEthereumAddress } from "@polkadot/util-crypto"
import { isPotentialEns } from "@talismn/on-chain-id"
import {
  ensNamesIsFetching,
  readEnsNameLookups,
  useResolveAddressesForEnsNames,
} from "@ui/atoms/ensNames"
import { useRecoilValue } from "recoil"

export const useResolveEnsName = (name?: string) => {
  // check if name is something we can look up
  const lookupName =
    // don't look up undefined
    name !== undefined &&
    // don't look up ethereum addresses
    !isEthereumAddress(name) &&
    // only look up potential ens names (dot separated string e.g. `ens.eth`)
    isPotentialEns(name)
      ? name
      : undefined

  // let caller detect if we're going to look name up or not
  const isLookup = lookupName !== undefined

  // add address to global list of addresses we want to query
  useResolveAddressesForEnsNames(lookupName)

  // retrieve result of global addresses query for this address
  const address = useRecoilValue(readEnsNameLookups(lookupName)) as string | null | undefined

  // let caller detect if we're still processing a lookup
  const isFetching = useRecoilValue(ensNamesIsFetching(lookupName)) as boolean

  return [address, { isLookup, isFetching }] as const
}

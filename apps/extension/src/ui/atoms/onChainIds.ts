import { OnChainIds } from "@talismn/on-chain-id"
import { api } from "@ui/api"
import { useEffect } from "react"
import { AtomEffect, DefaultValue, atom, selectorFamily, useSetRecoilState } from "recoil"

type OnChainIdsStore = {
  addresses: Map<string, number>
  onChainIds: OnChainIds
}

//
// hooks
//

export const useFetchOnChainIdsForAddresses = (addresses: string[] | string | undefined) => {
  const setMounted = useSetRecoilState(fetchAddresses(addresses))
  useEffect(() => {
    if (!addresses) return
    setMounted(true)
    return () => setMounted(false)
  }, [addresses, setMounted])
}

//
// selectors
//

export const readOnChainIds = selectorFamily({
  key: "useOnChainIdsReadSelector",
  get:
    (addresses: string[] | string | undefined) =>
    ({ get }) => {
      const { onChainIds } = get(onChainIdsAtom)

      if (addresses === undefined) return
      if (typeof addresses === "string") return onChainIds.get(addresses)
      return addresses.map((address) => onChainIds.get(address))
    },
})

const fetchAddresses = selectorFamily({
  key: "useOnChainIdsWriteSelector",
  get: () => () => true,
  set:
    (addresses: string[] | string | undefined) =>
    ({ set }, mounted: boolean | DefaultValue) =>
      set(onChainIdsAtom, (state) => {
        if (addresses === undefined) return state
        addresses = typeof addresses === "string" ? [addresses] : addresses

        const allAddresses = new Map(state.addresses)
        if (mounted)
          addresses.forEach((address) =>
            allAddresses.set(address, (allAddresses.get(address) ?? 0) + 1)
          )
        else
          addresses.forEach((address) => {
            const count = (allAddresses.get(address) ?? 0) - 1
            if (count > 0) allAddresses.set(address, count)
            else allAddresses.delete(address)
          })

        return { ...state, addresses: allAddresses }
      }),
})

//
// effects
//

const fetchOnChainIdsEffect: AtomEffect<OnChainIdsStore> = ({ onSet, setSelf }) => {
  onSet(({ addresses: allAddresses }) => {
    // immediately update atom from cache
    // this allows the UI to show the cached onChainIds immediately
    setSelf(updateOnChainIdsAtomFromCache)

    // fetch onChainIds
    const fetchAddresses = Array.from(allAddresses.keys())
    api.accountsOnChainIdsLookupAddresses(fetchAddresses).then((onChainIds) => {
      // update cache
      Object.entries(onChainIds).forEach(([address, onChainId]) =>
        onChainIdsCache.set(address, onChainId)
      )

      // update cache persistent storage
      persistCache()

      // update atom from cache
      setSelf(updateOnChainIdsAtomFromCache)
    })
  })
}

//
// atom
//

const onChainIdsAtom = atom<OnChainIdsStore>({
  key: "onChainIdsAtom",
  default: { addresses: new Map(), onChainIds: new Map() },
  effects: [fetchOnChainIdsEffect],
})

//
// cache
//

const onChainIdsCache = new Map<string, string | null>(
  JSON.parse(localStorage.getItem("TalismanOnChainIdsCache") ?? "[]")
)
const persistCache = () =>
  localStorage.setItem(
    "TalismanOnChainIdsCache",
    JSON.stringify(Array.from(onChainIdsCache.entries()))
  )
const updateOnChainIdsAtomFromCache = (store: OnChainIdsStore | DefaultValue) => {
  if (store instanceof DefaultValue) return store

  const onChainIds = new Map<string, string | null>()
  Array.from(store.addresses.keys()).forEach((address) => {
    const onChainId = onChainIdsCache.get(address)
    if (onChainId === undefined) return
    onChainIds.set(address, onChainId)
  })

  return { addresses: store.addresses, onChainIds }
}

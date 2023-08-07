import { api } from "@ui/api"
import { useEffect } from "react"
import { AtomEffect, DefaultValue, atom, selectorFamily, useSetRecoilState } from "recoil"

type EnsNamesStore = {
  names: Map<string, number>
  resolutions: Map<string, string | null>
  isFetching: Set<string>
}

//
// hooks
//

export const useResolveAddressesForEnsNames = (names: string[] | string | undefined) => {
  const setMounted = useSetRecoilState(resolveNames(names))
  useEffect(() => {
    if (!names) return
    setMounted(true)
    return () => setMounted(false)
  }, [names, setMounted])
}

//
// selectors
//

export const readEnsNameLookups = selectorFamily({
  key: "useResolveEnsNamesReadSelector",
  get:
    (names: string[] | string | undefined) =>
    ({ get }) => {
      const { resolutions } = get(ensNamesAtom)

      if (names === undefined) return
      if (typeof names === "string") return resolutions.get(names)
      return names.map((name) => resolutions.get(name))
    },
})

export const ensNamesIsFetching = selectorFamily({
  key: "ensNamesIsFetching",
  get:
    (names: string[] | string | undefined) =>
    ({ get }) => {
      const { isFetching } = get(ensNamesAtom)

      if (names === undefined) return
      if (typeof names === "string") return isFetching.has(names)
      return names.filter((name) => isFetching.has(name))
    },
})

const resolveNames = selectorFamily({
  key: "useResolveEnsNamesWriteSelector",
  get: () => () => true,
  set:
    (names: string[] | string | undefined) =>
    ({ set }, mounted: boolean | DefaultValue) =>
      set(ensNamesAtom, (state) => {
        if (names === undefined) return state
        names = typeof names === "string" ? [names] : names

        const allNames = new Map(state.names)
        if (mounted) names.forEach((name) => allNames.set(name, (allNames.get(name) ?? 0) + 1))
        else
          names.forEach((name) => {
            const count = (allNames.get(name) ?? 0) - 1
            if (count > 0) allNames.set(name, count)
            else allNames.delete(name)
          })

        return { ...state, names: allNames }
      }),
})

//
// effects
//

const resolveEnsNamesEffect: AtomEffect<EnsNamesStore> = ({ onSet, setSelf }) => {
  onSet(({ names: allNames }) => {
    const resolveNames = Array.from(allNames.keys())

    // immediately update atom from cache
    // this allows the UI to show the cached resolutions immediately
    setSelf(updateEnsNamesAtomFromCache)

    // set fetching status
    setSelf((store) =>
      store instanceof DefaultValue ? store : { ...store, isFetching: new Set(resolveNames) }
    )

    // resolve ens names
    api.accountsOnChainIdsResolveNames(resolveNames).then((resolutions) => {
      // update cache
      Object.entries(resolutions).forEach(([name, address]) => ensNamesCache.set(name, address))

      // update cache persistent storage
      persistCache()

      // update atom from cache
      setSelf(updateEnsNamesAtomFromCache)

      // remove fetching status
      setSelf((store) =>
        store instanceof DefaultValue ? store : { ...store, isFetching: new Set() }
      )
    })
  })
}

//
// atom
//

const ensNamesAtom = atom<EnsNamesStore>({
  key: "ensNamesAtom",
  default: { names: new Map(), resolutions: new Map(), isFetching: new Set() },
  effects: [resolveEnsNamesEffect],
})

//
// cache
//

const ensNamesCache = new Map<string, string | null>(
  JSON.parse(localStorage.getItem("TalismanEnsNamesCache") ?? "[]")
)
const persistCache = () =>
  localStorage.setItem("TalismanEnsNamesCache", JSON.stringify(Array.from(ensNamesCache.entries())))
const updateEnsNamesAtomFromCache = (store: EnsNamesStore | DefaultValue) => {
  if (store instanceof DefaultValue) return store

  const resolutions = new Map<string, string | null>()
  Array.from(store.names.keys()).forEach((name) => {
    const address = ensNamesCache.get(name)
    if (address === undefined) return
    resolutions.set(name, address)
  })

  return { ...store, resolutions }
}

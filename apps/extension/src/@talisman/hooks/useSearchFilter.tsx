import { useMemo } from "react"
import Fuse from "fuse.js"

export function useSearchFilter<T, K extends Fuse.FuseOptionKey<T>>(
  searchQuery: string | undefined,
  searchKeys: K | K[],
  list: T[]
) {
  const keys = useMemo(() => (Array.isArray(searchKeys) ? searchKeys : [searchKeys]), [searchKeys])
  const fuseList = useMemo(() => new Fuse(list, { keys }), [list, keys])

  return useMemo(
    () => (searchQuery ? fuseList.search(searchQuery).map(({ item }) => item) : list),
    [searchQuery, fuseList, list]
  )
}

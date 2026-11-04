import { bind } from "@react-rxjs/core"
import { useCallback } from "react"
import { BehaviorSubject } from "rxjs"

const collapsedGroups$ = new BehaviorSubject<ReadonlySet<string>>(new Set())
const [useCollapsedGroups] = bind(collapsedGroups$)

export const useCollapsedEarnGroups = () => {
  const collapsedGroups = useCollapsedGroups()

  const toggleGroup = useCallback((key: string) => {
    const next = new Set(collapsedGroups$.getValue())
    if (next.has(key)) next.delete(key)
    else next.add(key)
    collapsedGroups$.next(next)
  }, [])

  const setCollapsedGroups = useCallback(
    (keys: Iterable<string>) => collapsedGroups$.next(new Set(keys)),
    []
  )

  return { collapsedGroups, toggleGroup, setCollapsedGroups }
}

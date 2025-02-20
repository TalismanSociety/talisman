import { bind } from "@react-rxjs/core"
import { SetStateAction, useCallback } from "react"
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs"

const allOpenCloseState$ = new BehaviorSubject<{ [key: string]: boolean }>({})

export const [useGlobalOpenCloseValue, getGlobalOpenCloseValue$] = bind((key: string) =>
  allOpenCloseState$.pipe(
    map((state) => state[key] ?? false),
    distinctUntilChanged<boolean>(),
  ),
)

export const useGlobalOpenClose = (key: string) => {
  const isOpen = useGlobalOpenCloseValue(key)

  const setIsOpen = useCallback(
    (value: SetStateAction<boolean>) => {
      const newValue = typeof value === "function" ? value(allOpenCloseState$.value[key]) : value
      allOpenCloseState$.next({ ...allOpenCloseState$.value, [key]: newValue })
    },
    [key],
  )

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [setIsOpen])

  return { isOpen, setIsOpen, open, close, toggle }
}

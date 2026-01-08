import { bind } from "@react-rxjs/core"
import { BehaviorSubject, map } from "rxjs"

export type OpenCloseResult<T> =
  | {
      isOpen: false
      args: T | null // retains previous data when closed
      open: (args: T) => void
      close: () => void
    }
  | {
      isOpen: true
      args: T
      open: (args: T) => void
      close: () => void
    }

export const createGlobalOpenClose = <T>() => {
  const state$ = new BehaviorSubject<{
    isOpen: boolean
    args: T | null
  }>({ isOpen: false, args: null })

  return bind(() =>
    state$.pipe(
      map(
        ({ isOpen, args }) =>
          ({
            isOpen,
            open: (args: T) => state$.next({ isOpen: true, args }),
            close: () => state$.next({ isOpen: false, args }), // retain args so it can still be displayed while closing
            args,
          }) as OpenCloseResult<T>,
      ),
    ),
  )
}

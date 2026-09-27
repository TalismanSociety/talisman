import { bind } from "@react-rxjs/core"
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs"

type OpenFn<T> = [T] extends [undefined] ? () => void : (args: T) => void

export type OpenCloseResult<T> =
  | {
      isOpen: false
      args: T | null // retains previous data when closed
      open: OpenFn<T>
      close: () => void
    }
  | {
      isOpen: true
      args: T
      open: OpenFn<T>
      close: () => void
    }

export const createGlobalOpenClose = <T = undefined>() => {
  const state$ = new BehaviorSubject<{
    isOpen: boolean
    args: T | null
  }>({ isOpen: false, args: null })

  const open = ((args: T) => state$.next({ isOpen: true, args })) as OpenFn<T>
  // retain args so they can still be displayed while closing
  const close = () => state$.next({ isOpen: false, args: state$.value.args })

  return bind(() =>
    state$.pipe(
      distinctUntilChanged((a, b) => a.isOpen === b.isOpen && a.args === b.args),
      map(({ isOpen, args }) => ({ isOpen, args, open, close }) as OpenCloseResult<T>)
    )
  )
}

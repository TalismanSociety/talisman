import { bind } from "@react-rxjs/core"
import { BehaviorSubject, distinctUntilChanged, map } from "rxjs"

type OpenFn<T> = [T] extends [undefined] ? () => void : (args: T) => void

export type OpenCloseResult<T> =
  | {
      isOpen: false
      args: T | null // retains previous data when closed
      /** changes on each open: key the modal content on it to reset its state */
      openKey: number
      open: OpenFn<T>
      close: () => void
    }
  | {
      isOpen: true
      args: T
      openKey: number
      open: OpenFn<T>
      close: () => void
    }

export const createGlobalOpenClose = <T = undefined>() => {
  const state$ = new BehaviorSubject<{
    isOpen: boolean
    args: T | null
    openKey: number
  }>({ isOpen: false, args: null, openKey: 0 })

  const open = ((args: T) =>
    state$.next({ isOpen: true, args, openKey: state$.value.openKey + 1 })) as OpenFn<T>
  // retain args so they can still be displayed while closing
  const close = () => state$.next({ ...state$.value, isOpen: false })

  return bind(() =>
    state$.pipe(
      distinctUntilChanged(
        (a, b) => a.isOpen === b.isOpen && a.args === b.args && a.openKey === b.openKey
      ),
      map(
        ({ isOpen, args, openKey }) =>
          ({ isOpen, args, openKey, open, close }) as OpenCloseResult<T>
      )
    )
  )
}

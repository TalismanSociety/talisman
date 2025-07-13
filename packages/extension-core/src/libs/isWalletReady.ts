import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  shareReplay,
} from "rxjs"

const subjectIsWalletReady = new BehaviorSubject<boolean>(false)

export const isWalletReady$ = subjectIsWalletReady.asObservable()

// fires only once wallet is ready
export const walletReady$ = isWalletReady$.pipe(
  filter((isReady) => isReady),
  distinctUntilChanged(),
  shareReplay(1),
)

// returns a promise that resolves when the wallet is ready
export const walletReady = firstValueFrom(walletReady$.pipe(map(() => {})))

export const setWalletReady = () => {
  subjectIsWalletReady.next(true)
}

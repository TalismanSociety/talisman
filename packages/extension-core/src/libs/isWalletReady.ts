import { BehaviorSubject } from "rxjs"

const subjectIsWalletReady = new BehaviorSubject<boolean>(false)

export const isWalletReady$ = subjectIsWalletReady.asObservable()

export const setWalletReady = () => {
  subjectIsWalletReady.next(true)
}

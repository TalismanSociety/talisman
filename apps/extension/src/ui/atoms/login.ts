import { appStore } from "@core/domains/app/store.app"
import { api } from "@ui/api"
import { atom } from "recoil"
import { Subject, combineLatest } from "rxjs"

// shortcut to prevent using  walletDataState here, as this hook is used before login
// fetch both at once as they are always used together
export const loginState = atom<{ isLoggedIn: boolean; isOnboarded: boolean }>({
  key: "loginState",
  effects: [
    ({ setSelf }) => {
      const subjectIsLoggedIn = new Subject<boolean>()
      const unsubIsLoggedIn = api.authStatusSubscribe((v) => subjectIsLoggedIn.next(v === "TRUE"))

      const sub = combineLatest([appStore.observable, subjectIsLoggedIn]).subscribe(
        ([appState, isLoggedIn]) => {
          setSelf({
            isOnboarded: appState.onboarded === "TRUE",
            isLoggedIn,
          })
        }
      )

      return () => {
        sub.unsubscribe()
        unsubIsLoggedIn()
      }
    },
  ],
})

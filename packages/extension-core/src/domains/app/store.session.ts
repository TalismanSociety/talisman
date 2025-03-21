import { StorageProvider } from "../../libs/Store"
import { passwordStore } from "./store.password"

export interface SessionStoreData {
  isKeyringUpgradeBannerSnoozed: boolean
}

export class SessionStore extends StorageProvider<SessionStoreData> {
  public async reset() {
    await sessionStore.set(DEFAULT_VALUES)
  }
}

export const DEFAULT_VALUES: SessionStoreData = {
  isKeyringUpgradeBannerSnoozed: false,
}

export const sessionStore = new SessionStore("session", DEFAULT_VALUES)

// call this only from background.js
export const resetSessionOnUnlock = () => {
  let isLocked = false

  // first ensure wallet is not already unlocked: because of MV3 sleep mechanism, wallet might be unlocked on first call
  const subscription = passwordStore.isLoggedIn.subscribe((isLoggedIn) => {
    if (isLoggedIn === "TRUE") {
      if (isLocked) sessionStore.reset()
      subscription.unsubscribe()
    }
    if (isLoggedIn === "FALSE") {
      isLocked = true
    }
  })
}

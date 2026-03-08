import { StorageProvider } from "../../libs/Store"

export interface SessionStoreData {
  isBackupReminderBannerSnoozed: boolean
}

const DEFAULT_VALUES: SessionStoreData = {
  isBackupReminderBannerSnoozed: false,
}

class SessionStore extends StorageProvider<SessionStoreData> {
  public async reset() {
    await sessionStore.set(DEFAULT_VALUES)
  }
}

export const sessionStore = new SessionStore("session", DEFAULT_VALUES)

import { StorageProvider } from "../../libs/Store"

export interface SessionStoreData {
  isBackupReminderBannerSnoozed: boolean
}

export const DEFAULT_VALUES: SessionStoreData = {
  isBackupReminderBannerSnoozed: false,
}

export class SessionStore extends StorageProvider<SessionStoreData> {
  public async reset() {
    await sessionStore.set(DEFAULT_VALUES)
  }
}

export const sessionStore = new SessionStore("session", DEFAULT_VALUES)

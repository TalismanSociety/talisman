import { StorageProvider } from "../../libs/Store"
import type { QuickUnlockStoreData } from "./types"

/** An enrollment can only unlock the wallet if all of its parts are present */
export const isCompleteEnrollment = (
  data: QuickUnlockStoreData
): data is Required<QuickUnlockStoreData> =>
  !!(data.credentialId && data.encryptedPassword && data.iv && data.prfSalt)

class QuickUnlockStore extends StorageProvider<QuickUnlockStoreData> {
  async enroll(data: Required<QuickUnlockStoreData>): Promise<void> {
    await this.replace(data)
  }

  async unenroll(): Promise<void> {
    await this.replace({})
  }
}

export const quickUnlockStore = new QuickUnlockStore("quickUnlock", {})

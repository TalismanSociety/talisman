import { StorageProvider } from "../../libs/Store"
import type { SmartUnlockStoreData } from "./types"

/** An enrollment can only unlock the wallet if all of its parts are present */
export const isCompleteEnrollment = (
  data: SmartUnlockStoreData
): data is Required<SmartUnlockStoreData> =>
  !!(data.credentialId && data.encryptedPassword && data.iv && data.prfSalt)

class SmartUnlockStore extends StorageProvider<SmartUnlockStoreData> {
  async enroll(data: Required<SmartUnlockStoreData>): Promise<void> {
    await this.replace(data)
  }

  async unenroll(): Promise<void> {
    await this.replace({})
  }
}

export const smartUnlockStore = new SmartUnlockStore("smartUnlock", {})

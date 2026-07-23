import { StorageProvider } from "../../libs/Store"
import type { BiometricStoreData } from "./types"

/** An enrollment can only unlock the wallet if all of its parts are present */
export const isCompleteEnrollment = (
  data: BiometricStoreData
): data is Required<BiometricStoreData> =>
  !!(data.credentialId && data.encryptedPassword && data.iv && data.prfSalt)

class BiometricStore extends StorageProvider<BiometricStoreData> {
  async enroll(data: Required<BiometricStoreData>): Promise<void> {
    await this.replace(data)
  }

  async unenroll(): Promise<void> {
    await this.replace({})
  }
}

export const biometricStore = new BiometricStore("biometric", {})

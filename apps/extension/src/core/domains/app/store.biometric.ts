import { StorageProvider } from "../../libs/Store"
import type { BiometricStoreData } from "./types"

class BiometricStore extends StorageProvider<BiometricStoreData> {
  async isEnrolled(): Promise<boolean> {
    const { credentialId, userId, encryptedPassword, iv, prfSalt } = await this.get()
    return !!(credentialId && userId && encryptedPassword && iv && prfSalt)
  }

  async enroll(data: Required<BiometricStoreData>): Promise<void> {
    await this.replace(data)
  }

  async unenroll(): Promise<void> {
    await this.replace({} as BiometricStoreData)
  }
}

export const biometricStore = new BiometricStore("biometric", {})

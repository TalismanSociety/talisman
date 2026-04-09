import { StorageProvider } from "../../libs/Store"

export interface BiometricStoreData {
  /** Base64url-encoded WebAuthn credential ID */
  credentialId?: string
  /** Base64url-encoded WebAuthn user ID (needed for credential deletion) */
  userId?: string
  /** Hashed password encrypted with PRF-derived AES-256-GCM key (Base64) */
  encryptedPassword?: string
  /** AES-GCM initialization vector (Base64) */
  iv?: string
  /** Salt passed to the WebAuthn PRF extension (Base64) */
  prfSalt?: string
}

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

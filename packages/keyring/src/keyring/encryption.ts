import { pbkdf2 } from "@talismn/crypto"

// Derive a key generated with PBKDF2 that will be used for AES-GCM encryption
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> =>
  // Deriving 32-byte key using PBKDF2 with 100,000 iterations and SHA-256
  await crypto.subtle.importKey(
    "raw",
    await pbkdf2(
      "SHA-256",
      new TextEncoder().encode(password),
      salt,
      100_000, // 100,000 iterations
      32, // 32 bytes (32 * 8 == 256 bits)
    ),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )

export const encryptData = async (data: Uint8Array, password: string): Promise<string> => {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16)) // 16 bytes of salt
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 12-byte IV for AES-GCM
    const key = await deriveKey(password, salt)

    // encrypt
    const encryptedSeed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)

    // Combine salt, IV, and encrypted seed
    const combined = new Uint8Array(salt.length + iv.length + encryptedSeed.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encryptedSeed), salt.length + iv.length)

    // Base64 encode the combined data
    return btoa(String.fromCharCode(...combined))
  } catch (cause) {
    throw new Error("Failed to encrypt data", { cause })
  }
}

export const decryptData = async (encryptedData: string, password: string): Promise<Uint8Array> => {
  try {
    // Decode Base64 and parse the combined data
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

    // Extract salt, IV, and encrypted seed
    const salt = combined.slice(0, 16) // First 16 bytes
    const iv = combined.slice(16, 28) // Next 12 bytes
    const encryptedSeed = combined.slice(28) // Remaining bytes

    const key = await deriveKey(password, salt)

    // Decrypt the seed
    const decryptedSeed = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedSeed)

    return new Uint8Array(decryptedSeed)
  } catch (cause) {
    throw new Error("Failed to decrypt data", { cause })
  }
}

export const changeEncryptedDataPassword = async (
  encryptedData: string,
  oldPassword: string,
  newPassword: string,
) => {
  try {
    const decrypted = await decryptData(encryptedData, oldPassword)
    return await encryptData(decrypted, newPassword)
  } catch (cause) {
    throw new Error("Failed to change password on encrypted data", { cause })
  }
}

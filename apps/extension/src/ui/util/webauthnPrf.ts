import { IS_FIREFOX } from "@common/constants"

export interface EnrollmentResult {
  credentialId: string
  userId: string
  encryptedPassword: string
  iv: string
  prfSalt: string
}

// --- Feature Detection ---

export async function isBiometricAvailable(): Promise<boolean> {
  if (IS_FIREFOX) return false
  if (typeof window === "undefined") return false
  if (!window.PublicKeyCredential) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// --- Enrollment ---

export async function enrollBiometric(hashedPassword: string): Promise<EnrollmentResult> {
  const prfSalt = crypto.getRandomValues(new Uint8Array(32))
  const userId = crypto.getRandomValues(new Uint8Array(32))

  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "Talisman Wallet", id: chrome.runtime.id },
      user: {
        id: userId,
        name: "talisman-user",
        displayName: "Talisman User",
      },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      extensions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PRF extension not in TS types yet
        prf: { eval: { first: prfSalt } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error("Credential creation was cancelled")

  // biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
  const prfResults = (credential.getClientExtensionResults() as any).prf
  if (!prfResults?.results?.first) {
    throw new Error(
      "This authenticator does not support biometric unlock. Please use your device's built-in authenticator (Touch ID, Windows Hello) instead of a browser profile or security key."
    )
  }

  const prfOutput = new Uint8Array(prfResults.results.first)
  const aesKey = await deriveAesKey(prfOutput)

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(hashedPassword)
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded)

  return {
    credentialId: bufferToBase64Url(credential.rawId),
    userId: bufferToBase64Url(userId.buffer as ArrayBuffer),
    encryptedPassword: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    prfSalt: bufferToBase64(prfSalt.buffer as ArrayBuffer),
  }
}

// --- Unlock ---

export async function unlockWithBiometric(
  credentialId: string,
  prfSalt: string,
  encryptedPassword: string,
  iv: string
): Promise<string> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: chrome.runtime.id,
      allowCredentials: [
        {
          type: "public-key",
          id: base64UrlToBuffer(credentialId),
        },
      ],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: base64ToBuffer(prfSalt) } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null

  if (!assertion) throw new Error("Biometric authentication was cancelled")

  // biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
  const prfResults = (assertion.getClientExtensionResults() as any).prf
  if (!prfResults?.results?.first) {
    throw new Error("PRF evaluation failed")
  }

  const prfOutput = new Uint8Array(prfResults.results.first)
  const aesKey = await deriveAesKey(prfOutput)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(iv) },
    aesKey,
    base64ToBuffer(encryptedPassword)
  )

  return new TextDecoder().decode(decrypted)
}

// --- Key Derivation ---

async function deriveAesKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", prfOutput, "HKDF", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("talisman-biometric-v1"),
      info: new Uint8Array(0),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

// --- Encoding Helpers ---

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  return bufferToBase64(buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4)
  return base64ToBuffer(padded)
}

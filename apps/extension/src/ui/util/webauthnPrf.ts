import { base64ToBytes, base64UrlToBytes, bytesToBase64, bytesToBase64Url } from "@common/base64"
import { IS_FIREFOX } from "@common/constants"

/**
 * Drives the WebAuthn PRF ceremony. Only ever handles the PRF output, which is useless without the
 * ciphertext the background worker keeps to itself - the wallet password never reaches the UI.
 */

export type BiometricCredential = {
  /** Base64url-encoded WebAuthn credential ID */
  credentialId: string
  /** Base64url-encoded WebAuthn user ID (needed for credential deletion) */
  userId: string
  /** Base64-encoded salt passed to the PRF extension */
  prfSalt: string
  /** Base64-encoded PRF output, used by the background to derive the encryption key */
  prfOutput: string
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

export async function createBiometricCredential(): Promise<BiometricCredential> {
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
        prf: { eval: { first: prfSalt } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error("Credential creation was cancelled")

  const prfOutput = getPrfResult(credential)
  if (!prfOutput)
    throw new Error(
      "This authenticator does not support biometric unlock. Please use your device's built-in authenticator (Touch ID, Windows Hello) instead of a browser profile or security key."
    )

  return {
    credentialId: bytesToBase64Url(credential.rawId),
    userId: bytesToBase64Url(userId),
    prfSalt: bytesToBase64(prfSalt),
    prfOutput: bytesToBase64(prfOutput),
  }
}

// --- Unlock ---

/** Re-evaluates the PRF for an existing credential, returning the base64-encoded output */
export async function getBiometricPrfOutput(
  credentialId: string,
  prfSalt: string
): Promise<string> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: chrome.runtime.id,
      allowCredentials: [
        {
          type: "public-key",
          id: base64UrlToBytes(credentialId),
        },
      ],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: base64ToBytes(prfSalt) } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null

  if (!assertion) throw new Error("Biometric authentication was cancelled")

  const prfOutput = getPrfResult(assertion)
  if (!prfOutput) throw new Error("PRF evaluation failed")

  return bytesToBase64(prfOutput)
}

const getPrfResult = (credential: PublicKeyCredential): ArrayBuffer | undefined => {
  // biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
  const prf = (credential.getClientExtensionResults() as any).prf
  return prf?.results?.first as ArrayBuffer | undefined
}

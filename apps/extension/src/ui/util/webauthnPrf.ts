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

export async function createBiometricCredential(
  signal?: AbortSignal
): Promise<BiometricCredential> {
  const prfSaltBytes = crypto.getRandomValues(new Uint8Array(32))
  const prfSalt = bytesToBase64(prfSaltBytes)
  const userId = crypto.getRandomValues(new Uint8Array(32))

  const credential = (await navigator.credentials.create({
    signal,
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
        prf: { eval: { first: prfSaltBytes } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error("Credential creation was cancelled")

  const credentialId = bytesToBase64Url(credential.rawId)
  const prf = getPrfExtensionResults(credential)

  // an authenticator that supports PRF may still be unable to evaluate it while creating the
  // credential, in which case the spec only guarantees `enabled` and requires an assertion to
  // obtain the output
  if (!prf?.enabled && !prf?.results?.first)
    throw new Error(
      "This authenticator does not support biometric unlock. Please use your device's built-in authenticator (Touch ID, Windows Hello) instead of a browser profile or security key. A passkey may have been created, you can remove it from your system settings."
    )

  const prfOutput = prf.results?.first
    ? bytesToBase64(prf.results.first)
    : await getBiometricPrfOutput(credentialId, prfSalt, signal)

  return {
    credentialId,
    userId: bytesToBase64Url(userId),
    prfSalt,
    prfOutput,
  }
}

// --- Unlock ---

/** Re-evaluates the PRF for an existing credential, returning the base64-encoded output */
export async function getBiometricPrfOutput(
  credentialId: string,
  prfSalt: string,
  signal?: AbortSignal
): Promise<string> {
  const assertion = (await navigator.credentials.get({
    signal,
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

  const prfOutput = getPrfExtensionResults(assertion)?.results?.first
  if (!prfOutput) throw new Error("PRF evaluation failed")

  return bytesToBase64(prfOutput)
}

type PrfExtensionResults = { enabled?: boolean; results?: { first?: ArrayBuffer } }

const getPrfExtensionResults = (credential: PublicKeyCredential): PrfExtensionResults | undefined =>
  // biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
  (credential.getClientExtensionResults() as any).prf

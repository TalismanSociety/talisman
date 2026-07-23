import { IS_FIREFOX } from "@common/constants"
import { log } from "@common/log"
import { base64, base64urlnopad } from "@talismn/crypto"

/**
 * Drives the WebAuthn PRF ceremony. Only ever handles the PRF output, which is useless without the
 * ciphertext the background worker keeps to itself - the wallet password never reaches the UI.
 */

export type BiometricCredential = {
  /** Base64url-encoded WebAuthn credential ID */
  credentialId: string
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
  const prfSalt = base64.encode(prfSaltBytes)
  // the user handle is required by the spec but never used, credentials are addressed by their id
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

  const credentialId = base64urlnopad.encode(new Uint8Array(credential.rawId))
  const prf = getPrfExtensionResults(credential)

  // an authenticator that supports PRF may still be unable to evaluate it while creating the
  // credential, in which case the spec only guarantees `enabled` and requires an assertion to
  // obtain the output
  if (!prf?.enabled && !prf?.results?.first)
    throw new Error(
      "This authenticator does not support biometric unlock. Please use your device's built-in authenticator (Touch ID, Windows Hello) instead of a browser profile or security key. A passkey may have been created, you can remove it from your system settings."
    )

  const prfOutput = prf.results?.first
    ? base64.encode(new Uint8Array(prf.results.first))
    : await getBiometricPrfOutput(credentialId, prfSalt, signal)

  return { credentialId, prfSalt, prfOutput }
}

/**
 * Tells the authenticator that we no longer know about this credential, so it can offer to delete
 * the passkey. Best-effort: not all browsers implement the signal API.
 */
export async function signalCredentialRemoved(credentialId: string): Promise<void> {
  // biome-ignore lint/suspicious/noExplicitAny: signal API not in TS types yet
  const signalUnknownCredential = (PublicKeyCredential as any)?.signalUnknownCredential
  if (typeof signalUnknownCredential !== "function") return

  try {
    await signalUnknownCredential.call(PublicKeyCredential, {
      rpId: chrome.runtime.id,
      credentialId,
    })
  } catch (err) {
    log.warn("Failed to signal biometric credential removal", { err })
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
          id: base64urlnopad.decode(credentialId) as Uint8Array<ArrayBuffer>,
        },
      ],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: base64.decode(prfSalt) } },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null

  if (!assertion) throw new Error("Biometric authentication was cancelled")

  const prfOutput = getPrfExtensionResults(assertion)?.results?.first
  if (!prfOutput) throw new Error("PRF evaluation failed")

  return base64.encode(new Uint8Array(prfOutput))
}

type PrfExtensionResults = { enabled?: boolean; results?: { first?: ArrayBuffer } }

const getPrfExtensionResults = (credential: PublicKeyCredential): PrfExtensionResults | undefined =>
  // biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
  (credential.getClientExtensionResults() as any).prf

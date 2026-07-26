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

  // the passkey exists from here on, don't leave it behind if we end up unable to use it
  try {
    const prf = getPrfExtensionResults(credential)

    // an authenticator that supports PRF may still be unable to evaluate it while creating the
    // credential, and may not even advertise support at that point - Windows Hello reports nothing
    // at all on Chrome 146 and below, while evaluating the PRF just fine during an assertion.
    // asking for one is the only reliable way to find out
    const prfOutput = prf?.results?.first
      ? base64.encode(new Uint8Array(prf.results.first))
      : await getBiometricPrfOutput(credentialId, prfSalt, signal)

    return { credentialId, prfSalt, prfOutput }
  } catch (err) {
    await signalCredentialRemoved(credentialId)
    throw err
  }
}

/**
 * Tells the authenticator that we no longer know about this credential, so it can offer to delete
 * the passkey. Best-effort: not all browsers implement the signal API.
 */
export async function signalCredentialRemoved(credentialId: string): Promise<void> {
  // biome-ignore lint/suspicious/noExplicitAny: signal API not in TS types yet
  const publicKeyCredential = (globalThis as any).PublicKeyCredential
  const signalUnknownCredential = publicKeyCredential?.signalUnknownCredential
  if (typeof signalUnknownCredential !== "function") return

  try {
    await signalUnknownCredential.call(publicKeyCredential, {
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
  if (!prfOutput) throw new PrfEvaluationError()

  return base64.encode(new Uint8Array(prfOutput))
}

/**
 * The ceremony completed but the authenticator returned no PRF output, it can't do this.
 * User facing copy lives in useBiometricErrorMessage, keyed on the error name.
 */
export class PrfEvaluationError extends Error {
  constructor() {
    super("PRF evaluation failed")
    this.name = "PrfEvaluationError"
  }
}

// `enabled` is deliberately left out: it is unset on the browsers that evaluate the PRF anyway,
// so it can't be used to decide anything
type PrfExtensionResults = { results?: { first?: ArrayBuffer } }

const getPrfExtensionResults = (credential: PublicKeyCredential): PrfExtensionResults | undefined =>
  // biome-ignore lint/suspicious/noExplicitAny: PRF extension results not in TS types yet
  (credential.getClientExtensionResults() as any).prf

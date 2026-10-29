import { ed25519 } from "@noble/curves/ed25519.js"
import { z } from "zod"

const GANDALF_URL = "https://gandalf.talisman.xyz"
const REQUEST_TIMEOUT_MS = 30_000

const SHA256_BITS = 256

const challengeResponseSchema = z.object({
  challenge: z.string().min(1),
  difficulty: z.number().int().min(0).max(SHA256_BITS),
  expiresAt: z.number(),
})

const registrationResponseSchema = z.object({ installId: z.string().min(1) })

const accessTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().positive(),
})

export class GandalfRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Seconds the server asks us to wait before trying again, when it says. */
    readonly retryAfter?: number
  ) {
    super(message)
    this.name = "GandalfRequestError"
  }
}

const parseRetryAfterSeconds = (...candidates: unknown[]): number | undefined => {
  for (const candidate of candidates) {
    const seconds =
      typeof candidate === "string" && candidate.trim() !== "" ? Number(candidate) : candidate
    if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) return seconds
  }
  return undefined
}

const toRequestError = async (res: Response, request: string): Promise<GandalfRequestError> => {
  const body = (await res.json().catch(() => ({}))) as { message?: string; retryAfter?: unknown }
  return new GandalfRequestError(
    `Gandalf ${request} failed (${res.status}): ${body?.message ?? "unknown"}`,
    res.status,
    parseRetryAfterSeconds(res.headers.get("Retry-After"), body?.retryAfter)
  )
}

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// ── PoW solver ────────────────────────────────────────────────────────────────

export async function solveProofOfWork(challenge: string, difficulty: number): Promise<string> {
  for (let i = 0; ; i++) {
    const solution = i.toString()
    const input = new TextEncoder().encode(challenge + solution)
    const hash = await crypto.subtle.digest("SHA-256", input)
    const bytes = new Uint8Array(hash)

    let zeroBits = 0
    for (const byte of bytes) {
      if (byte === 0) {
        zeroBits += 8
      } else {
        zeroBits += Math.clz32(byte) - 24
        break
      }
    }

    if (zeroBits >= difficulty) return solution
  }
}

// ── Gandalf API calls ─────────────────────────────────────────────────────────

export async function fetchChallenge(): Promise<{
  challenge: string
  difficulty: number
  expiresAt: number
}> {
  const res = await fetch(`${GANDALF_URL}/v1/challenge`, {
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw await toRequestError(res, "challenge request")
  return challengeResponseSchema.parse(await res.json())
}

export type ProofOfWorkSolve = { durationMs: number; difficulty: number }

/**
 * One-time registration: generates an Ed25519 keypair, solves a PoW challenge,
 * and registers with Gandalf. Each HTTP call has its own timeout; the PoW solve has none.
 *
 * @returns The install credentials (installId + privateKeyHex) and how long the PoW took.
 */
export async function registerInstall(): Promise<{
  installId: string
  privateKeyHex: string
  proofOfWork: ProofOfWorkSolve
}> {
  // Generate a new Ed25519 keypair
  const privateKey = ed25519.utils.randomSecretKey()
  const publicKey = ed25519.getPublicKey(privateKey)

  const pubKeyJWK = {
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    x: base64urlEncode(publicKey),
  }

  // Fetch and solve PoW challenge
  const { challenge, difficulty } = await fetchChallenge()
  const solveStartedAt = performance.now()
  const solution = await solveProofOfWork(challenge, difficulty)
  const proofOfWork = { durationMs: Math.round(performance.now() - solveStartedAt), difficulty }

  // Register
  const res = await fetch(`${GANDALF_URL}/v1/install/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pubKey: pubKeyJWK, challenge, solution }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!res.ok) throw await toRequestError(res, "registration")

  const { installId } = registrationResponseSchema.parse(await res.json())
  const privateKeyHex = bytesToHex(privateKey)

  return { installId, privateKeyHex, proofOfWork }
}

/**
 * Request a short-lived JWT access token by signing a proof-of-possession.
 */
export async function requestAccessToken(
  installId: string,
  privateKeyHex: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomUUID()
  const canonical = `token_request:${installId}:${timestamp}:${nonce}`

  const data = new TextEncoder().encode(canonical)
  const privateKey = hexToBytes(privateKeyHex)
  const sigBytes = ed25519.sign(data, privateKey)
  const signature = base64urlEncode(sigBytes)

  const res = await fetch(`${GANDALF_URL}/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ installId, timestamp, nonce, signature }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!res.ok) throw await toRequestError(res, "token request")

  return accessTokenResponseSchema.parse(await res.json())
}

import { ed25519 } from "@noble/curves/ed25519.js"
import { vi } from "vitest"
import { ZodError } from "zod"

import {
  base64urlEncode,
  bytesToHex,
  fetchChallenge,
  GandalfRequestError,
  hexToBytes,
  registerInstall,
  requestAccessToken,
  solveProofOfWork,
} from "../client"

// ── base64urlEncode ─────────────────────────────────────────────────────

describe("base64urlEncode", () => {
  it("encodes an empty Uint8Array", () => {
    expect(base64urlEncode(new Uint8Array([]))).toBe("")
  })

  it("encodes bytes to base64url (no padding, url-safe chars)", () => {
    // "Hello" in ASCII
    const bytes = new Uint8Array([72, 101, 108, 108, 111])
    const result = base64urlEncode(bytes)

    // Standard base64: "SGVsbG8=" → base64url should strip padding
    expect(result).toBe("SGVsbG8")
    expect(result).not.toContain("+")
    expect(result).not.toContain("/")
    expect(result).not.toContain("=")
  })

  it("replaces + with - and / with _", () => {
    // 0xFB, 0xFF, 0xFE → base64 is "+//+" → base64url is "-__-"
    const bytes = new Uint8Array([0xfb, 0xff, 0xfe])
    const result = base64urlEncode(bytes)
    expect(result).not.toContain("+")
    expect(result).not.toContain("/")
  })
})

// ── hexToBytes / bytesToHex ─────────────────────────────────────────────

describe("hexToBytes", () => {
  it("converts a hex string to bytes", () => {
    expect(hexToBytes("deadbeef")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
  })

  it("handles empty string", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array([]))
  })
})

describe("bytesToHex", () => {
  it("converts bytes to lowercase hex", () => {
    expect(bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef")
  })

  it("zero-pads single-digit hex values", () => {
    expect(bytesToHex(new Uint8Array([0, 1, 15]))).toBe("00010f")
  })

  it("handles empty array", () => {
    expect(bytesToHex(new Uint8Array([]))).toBe("")
  })
})

// ── solveProofOfWork ────────────────────────────────────────────────────

describe("solveProofOfWork", () => {
  it("finds a solution where SHA-256(challenge + solution) has N leading zero bits", async () => {
    const challenge = "test-challenge-abc123"
    const difficulty = 4 // low difficulty for fast test execution

    const solution = await solveProofOfWork(challenge, difficulty)

    // Verify the solution independently
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

    expect(zeroBits).toBeGreaterThanOrEqual(difficulty)
  })
})

// ── fetchChallenge ──────────────────────────────────────────────────────────

describe("fetchChallenge", () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("returns challenge data on success", async () => {
    const mockResponse = { challenge: "abc123", difficulty: 16, expiresAt: 9999999999 }
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }))

    const result = await fetchChallenge()

    expect(result).toEqual(mockResponse)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://gandalf.talisman.xyz/v1/challenge",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("", { status: 500 }))

    await expect(fetchChallenge()).rejects.toThrow("Gandalf challenge request failed (500)")
  })

  it.each([
    ["no difficulty", { challenge: "x", expiresAt: 0 }],
    ["a fractional difficulty", { challenge: "x", difficulty: 1.5, expiresAt: 0 }],
    ["a difficulty above the hash size", { challenge: "x", difficulty: 257, expiresAt: 0 }],
    ["no challenge", { difficulty: 1, expiresAt: 0 }],
  ])("rejects a successful challenge reply with %s", async (_, body) => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }))

    await expect(fetchChallenge()).rejects.toThrow(ZodError)
  })

  it("gives the request its own timeout signal", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challenge: "x", difficulty: 1, expiresAt: 0 }), {
        status: 200,
      })
    )

    await fetchChallenge()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})

// ── registerInstall ─────────────────────────────────────────────────────────

describe("registerInstall", () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("generates keypair, solves PoW, and returns credentials", async () => {
    // Mock fetch: first call = challenge, second call = register
    const fetchMock = vi
      .fn()
      // challenge endpoint
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ challenge: "test-challenge", difficulty: 1, expiresAt: 9999999999 }),
          { status: 200 }
        )
      )
      // register endpoint
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ installId: "inst-xyz" }), { status: 200 })
      )

    globalThis.fetch = fetchMock

    const result = await registerInstall()

    expect(result.installId).toBe("inst-xyz")
    expect(result.privateKeyHex).toHaveLength(64) // 32-byte private key = 64 hex chars
    expect(result.proofOfWork).toEqual({ durationMs: expect.any(Number), difficulty: 1 })
    expect(Number.isInteger(result.proofOfWork.durationMs)).toBe(true)

    // Verify the register call sent the right shape
    const registerCall = fetchMock.mock.calls[1]
    expect(registerCall[0]).toBe("https://gandalf.talisman.xyz/v1/install/register")
    const body = JSON.parse(registerCall[1]?.body as string)
    expect(body).toHaveProperty("pubKey.kty", "OKP")
    expect(body).toHaveProperty("pubKey.crv", "Ed25519")
    expect(body).toHaveProperty("challenge", "test-challenge")
    expect(body).toHaveProperty("solution")
  })

  it("rejects a successful registration reply without an install id", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge: "c", difficulty: 1, expiresAt: 0 }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))

    await expect(registerInstall()).rejects.toThrow(ZodError)
  })

  it("throws with server message on registration failure", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ challenge: "c", difficulty: 1, expiresAt: 0 }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "PoW expired" }), { status: 400 })
      )

    await expect(registerInstall()).rejects.toThrow(
      "Gandalf registration failed (400): PoW expired"
    )
  })
})

// ── requestAccessToken ──────────────────────────────────────────────────────

describe("requestAccessToken", () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it("sends a signed token request and returns JWT", async () => {
    const priv = ed25519.utils.randomSecretKey()
    const privHex = bytesToHex(priv)

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ accessToken: "jwt-999", expiresIn: 300 }), { status: 200 })
      )

    const result = await requestAccessToken("inst-1", privHex)

    expect(result).toEqual({ accessToken: "jwt-999", expiresIn: 300 })

    // Verify the request body shape
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("https://gandalf.talisman.xyz/v1/token")
    const body = JSON.parse(init.body)
    expect(body.installId).toBe("inst-1")
    expect(body.timestamp).toBeDefined()
    expect(body.nonce).toBeDefined()
    expect(body.signature).toBeDefined()
    // Signature should be valid base64url
    expect(body.signature).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("sends a verifiable Ed25519 signature", async () => {
    const priv = ed25519.utils.randomSecretKey()
    const pub = ed25519.getPublicKey(priv)
    const privHex = bytesToHex(priv)

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ accessToken: "jwt", expiresIn: 60 }), { status: 200 })
      )

    await requestAccessToken("inst-verify", privHex)

    const body = JSON.parse(
      ((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit)
        .body as string
    )

    // Reconstruct the canonical string
    const canonical = `token_request:${body.installId}:${body.timestamp}:${body.nonce}`
    const data = new TextEncoder().encode(canonical)

    // Decode the base64url signature back to bytes
    const sigBase64 = body.signature.replace(/-/g, "+").replace(/_/g, "/")
    const sigBinary = atob(sigBase64)
    const sigBytes = new Uint8Array(sigBinary.length)
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i)
    }

    expect(ed25519.verify(sigBytes, data, pub)).toBe(true)
  })

  it("throws with server message on failure", async () => {
    const priv = ed25519.utils.randomSecretKey()

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "invalid signature" }), { status: 401 })
      )

    await expect(requestAccessToken("inst-1", bytesToHex(priv))).rejects.toThrow(
      "Gandalf token request failed (401): invalid signature"
    )
  })

  it.each([
    ["no access token", { expiresIn: 300 }],
    ["an empty access token", { accessToken: "", expiresIn: 300 }],
    ["no expiry", { accessToken: "jwt" }],
  ])("rejects a successful reply with %s", async (_, body) => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }))

    await expect(
      requestAccessToken("inst-1", bytesToHex(ed25519.utils.randomSecretKey()))
    ).rejects.toThrow(ZodError)
  })

  const failWith = (status: number, body: unknown, headers?: HeadersInit) => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body), { status, headers }))
    return requestAccessToken("inst-1", bytesToHex(ed25519.utils.randomSecretKey())).then(
      () => {
        throw new Error("expected the token request to fail")
      },
      (error: unknown) => error as GandalfRequestError
    )
  }

  it("attaches the status and the Retry-After header to its error", async () => {
    const error = await failWith(429, { message: "slow down" }, { "Retry-After": "60" })

    expect(error).toBeInstanceOf(GandalfRequestError)
    expect(error).toMatchObject({ status: 429, retryAfter: 60 })
  })

  it("falls back to the body's retryAfter when there is no header", async () => {
    const error = await failWith(429, { message: "slow down", retryAfter: 45 })

    expect(error).toMatchObject({ status: 429, retryAfter: 45 })
  })

  it("falls back to the body when the Retry-After header is blank", async () => {
    const error = await failWith(429, { retryAfter: 60 }, { "Retry-After": " " })

    expect(error).toMatchObject({ status: 429, retryAfter: 60 })
  })

  it("ignores a Retry-After it cannot use", async () => {
    const error = await failWith(
      503,
      { retryAfter: -1 },
      { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }
    )

    expect(error).toMatchObject({ status: 503 })
    expect(error.retryAfter).toBeUndefined()
  })
})

import { ed25519 } from "@noble/curves/ed25519"

import {
  base64urlEncode,
  bytesToHex,
  fetchChallenge,
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

  it("encodes an Ed25519 public key to 43-char base64url", () => {
    const priv = ed25519.utils.randomPrivateKey()
    const pub = ed25519.getPublicKey(priv)
    const encoded = base64urlEncode(pub)

    // Ed25519 public key is 32 bytes → ceil(32*4/3) = 43 base64url chars (no padding)
    expect(encoded).toHaveLength(43)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

// ── hexToBytes / bytesToHex roundtrip ───────────────────────────────────

describe("hexToBytes", () => {
  it("converts a hex string to bytes", () => {
    expect(hexToBytes("deadbeef")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
  })

  it("handles empty string", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array([]))
  })

  it("handles lowercase hex", () => {
    expect(hexToBytes("0a0b0c")).toEqual(new Uint8Array([10, 11, 12]))
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

describe("hexToBytes ↔ bytesToHex roundtrip", () => {
  it("roundtrips an Ed25519 private key", () => {
    const priv = ed25519.utils.randomPrivateKey()
    const hex = bytesToHex(priv)
    const back = hexToBytes(hex)

    expect(back).toEqual(priv)
    expect(hex).toHaveLength(64) // 32 bytes = 64 hex chars
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

  it("returns a string (the numeric solution)", async () => {
    const solution = await solveProofOfWork("challenge", 1)
    expect(typeof solution).toBe("string")
    // Solution should be a non-negative integer string
    expect(Number.parseInt(solution, 10)).toBeGreaterThanOrEqual(0)
  })
})

// ── requestAccessToken signing ──────────────────────────────────────────

describe("Ed25519 signing roundtrip (used by requestAccessToken)", () => {
  it("signs a canonical token_request string and the signature verifies", async () => {
    const priv = ed25519.utils.randomPrivateKey()
    const pub = ed25519.getPublicKey(priv)
    const privHex = bytesToHex(priv)

    const canonical = `token_request:some-install-id:1234567890:some-nonce`
    const data = new TextEncoder().encode(canonical)

    // Sign with hex → bytes → ed25519.sign (same as requestAccessToken)
    const privBytes = hexToBytes(privHex)
    const sigBytes = ed25519.sign(data, privBytes)

    // Verify signature
    const valid = ed25519.verify(sigBytes, data, pub)
    expect(valid).toBe(true)
  })

  it("rejects tampered data", () => {
    const priv = ed25519.utils.randomPrivateKey()
    const pub = ed25519.getPublicKey(priv)

    const data = new TextEncoder().encode("token_request:id:123:nonce")
    const sigBytes = ed25519.sign(data, priv)

    const tampered = new TextEncoder().encode("token_request:id:123:TAMPERED")
    expect(ed25519.verify(sigBytes, tampered, pub)).toBe(false)
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

  it("passes abort signal through", async () => {
    const controller = new AbortController()
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ challenge: "x", difficulty: 1, expiresAt: 0 }), {
        status: 200,
      })
    )

    await fetchChallenge(controller.signal)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
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

    // Verify the register call sent the right shape
    const registerCall = fetchMock.mock.calls[1]
    expect(registerCall[0]).toBe("https://gandalf.talisman.xyz/v1/install/register")
    const body = JSON.parse(registerCall[1]?.body as string)
    expect(body).toHaveProperty("pubKey.kty", "OKP")
    expect(body).toHaveProperty("pubKey.crv", "Ed25519")
    expect(body).toHaveProperty("challenge", "test-challenge")
    expect(body).toHaveProperty("solution")
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
    const priv = ed25519.utils.randomPrivateKey()
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
    const priv = ed25519.utils.randomPrivateKey()
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
    const priv = ed25519.utils.randomPrivateKey()

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: "invalid signature" }), { status: 401 })
      )

    await expect(requestAccessToken("inst-1", bytesToHex(priv))).rejects.toThrow(
      "Gandalf token request failed (401): invalid signature"
    )
  })
})

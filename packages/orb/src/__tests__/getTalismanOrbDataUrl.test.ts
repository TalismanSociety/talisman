import { describe, expect, it } from "vitest"

import { computeTalismanOrb } from "../computeTalismanOrb"
import { getTalismanOrbDataUrl } from "../util/getTalismanOrbDataUrl"

// Known Solana address
const SOLANA_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
// Known Ethereum address
const ETH_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
// Known Substrate address (Alice)
const SUBSTRATE_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
// Known Bitcoin account identity (BIP84 payments xpub)
const BITCOIN_XPUB =
  "xpub6DLW2JZKHXTqdr7vSqxkyCqgGW2mzAisTELehKyBxr68FQomQTCNU5Emdh5soFQ82S5JYmHSACJwzVUwg5TdsDYA55mkep3ibRkV7Hxhd67"

describe("computeTalismanOrb", () => {
  it("returns deterministic output for the same seed", () => {
    const a = computeTalismanOrb(SOLANA_ADDRESS)
    const b = computeTalismanOrb(SOLANA_ADDRESS)
    expect(a).toEqual(b)
  })

  it("returns different output for different seeds", () => {
    const a = computeTalismanOrb(SOLANA_ADDRESS)
    const b = computeTalismanOrb(ETH_ADDRESS)
    expect(a.bgColor1).not.toEqual(b.bgColor1)
  })

  it("detects solana platform", () => {
    const result = computeTalismanOrb(SOLANA_ADDRESS)
    expect(result.platform).toBe("solana")
  })

  it("detects ethereum platform", () => {
    const result = computeTalismanOrb(ETH_ADDRESS)
    expect(result.platform).toBe("ethereum")
  })

  it("detects polkadot platform", () => {
    const result = computeTalismanOrb(SUBSTRATE_ADDRESS)
    expect(result.platform).toBe("polkadot")
  })

  it("detects bitcoin platform", () => {
    const result = computeTalismanOrb(BITCOIN_XPUB)
    expect(result.platform).toBe("bitcoin")
  })

  it("returns valid hex colors", () => {
    const result = computeTalismanOrb(ETH_ADDRESS)
    const hexColorRegex = /^#[0-9A-F]{6}$/i
    expect(result.bgColor1).toMatch(hexColorRegex)
    expect(result.bgColor2).toMatch(hexColorRegex)
    expect(result.glowColor).toMatch(hexColorRegex)
  })

  it("returns valid transform string", () => {
    const result = computeTalismanOrb(ETH_ADDRESS)
    expect(result.transform).toMatch(/^rotate\(\d+ 32 32\)$/)
  })

  it("falls back gracefully for invalid addresses", () => {
    const result = computeTalismanOrb("not-a-real-address")
    expect(result.platform).toBe("polkadot")
    expect(result.bgColor1).toBeDefined()
  })
})

describe("getTalismanOrbDataUrl", () => {
  it("returns a valid base64 data URI", () => {
    const url = getTalismanOrbDataUrl(SOLANA_ADDRESS)
    expect(url).toMatch(/^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/)
  })

  it("decodes to valid SVG", () => {
    const url = getTalismanOrbDataUrl(ETH_ADDRESS)
    const base64 = url.replace("data:image/svg+xml;base64,", "")
    const svg = atob(base64)
    expect(svg).toContain("<svg")
    expect(svg).toContain("</svg>")
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it("includes ethereum logo for eth address", () => {
    const url = getTalismanOrbDataUrl(ETH_ADDRESS)
    const svg = atob(url.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain('class="orb-type"')
    expect(svg).toContain("M12.8101 32.76") // ethereum diamond path
  })

  it("includes solana logo for solana address", () => {
    const url = getTalismanOrbDataUrl(SOLANA_ADDRESS)
    const svg = atob(url.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain('class="orb-type"')
    expect(svg).toContain("M70.6648 50.1769") // solana path
  })

  it("includes bitcoin logo for bitcoin xpub", () => {
    const url = getTalismanOrbDataUrl(BITCOIN_XPUB)
    const svg = atob(url.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain('class="orb-type"')
    expect(svg).toContain("M16.28 10.52") // bitcoin ₿ path
  })

  it("includes polkadot logo for polkadot address", () => {
    const url = getTalismanOrbDataUrl(SUBSTRATE_ADDRESS)
    const svg = atob(url.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain('class="orb-type"')
    expect(svg).toContain('cx="16.9926" cy="2.83173"') // polkadot dot grid
  })

  it("includes correct gradient colors from computation", () => {
    const data = computeTalismanOrb(ETH_ADDRESS)
    const url = getTalismanOrbDataUrl(ETH_ADDRESS)
    const svg = atob(url.replace("data:image/svg+xml;base64,", ""))
    expect(svg).toContain(data.bgColor1)
    expect(svg).toContain(data.bgColor2)
    expect(svg).toContain(data.glowColor)
  })

  it("is deterministic", () => {
    const a = getTalismanOrbDataUrl(SOLANA_ADDRESS)
    const b = getTalismanOrbDataUrl(SOLANA_ADDRESS)
    expect(a).toBe(b)
  })
})

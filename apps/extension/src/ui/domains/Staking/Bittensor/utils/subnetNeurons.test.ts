import { describe, expect, it } from "vitest"

import { cleanName, type Metagraph, normalizeMetagraph } from "./subnetNeurons"

// distinct, valid ss58 addresses so isAddressEqual can decode them
const OWNER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const VALIDATOR = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const MINER = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"

// polkadot-api v2 decodes the identity name as a Uint8Array
const identity = (text: string) => ({ name: new TextEncoder().encode(text) })

const buildMetagraph = (overrides: Partial<NonNullable<Metagraph>> = {}): Metagraph =>
  ({
    num_uids: 3,
    owner_hotkey: OWNER,
    hotkeys: [OWNER, VALIDATOR, MINER],
    coldkeys: ["cold-owner", "cold-val", "cold-miner"],
    validator_permit: [true, true, false],
    alpha_stake: [100n, 50n, 5n],
    identities: [identity("  Owner Co  "), undefined, identity("")],
    ...overrides,
  }) as unknown as Metagraph

describe("normalizeMetagraph", () => {
  it("returns an empty array when the metagraph is undefined", () => {
    expect(normalizeMetagraph(undefined)).toEqual([])
  })

  it("assigns role with owner > validator > miner precedence", () => {
    const rows = normalizeMetagraph(buildMetagraph())
    expect(rows.map((r) => r.role)).toEqual(["owner", "validator", "miner"])
  })

  it("flattens per-uid columns into rows", () => {
    const rows = normalizeMetagraph(buildMetagraph())
    expect(rows).toHaveLength(3)
    expect(rows[1]).toMatchObject({
      hotkey: VALIDATOR,
      coldkey: "cold-val",
      uid: 1,
      stakeOnSubnet: 50n,
    })
  })

  it("resolves the on-chain identity name, trimming and nulling blanks", () => {
    const rows = normalizeMetagraph(buildMetagraph())
    expect(rows[0].onChainName).toBe("Owner Co") // trimmed
    expect(rows[1].onChainName).toBeNull() // identity undefined
    expect(rows[2].onChainName).toBeNull() // empty name
  })

  it("clamps to the number of hotkeys and skips empty hotkey slots", () => {
    const rows = normalizeMetagraph(
      buildMetagraph({
        num_uids: 5, // larger than hotkeys.length
        hotkeys: [OWNER, "", MINER],
        coldkeys: ["c0", "c1", "c2"],
        validator_permit: [true, false, false],
        alpha_stake: [1n, 2n, 3n],
        identities: [undefined, undefined, undefined],
      })
    )
    // 3 hotkeys (clamped from num_uids 5), but uid 1 is empty → skipped
    expect(rows.map((r) => r.uid)).toEqual([0, 2])
  })

  it("defaults missing columns safely", () => {
    const rows = normalizeMetagraph(
      buildMetagraph({
        validator_permit: [],
        alpha_stake: [],
        coldkeys: [],
      })
    )
    expect(rows[0]).toMatchObject({
      role: "owner", // still owner via owner_hotkey match
      coldkey: "",
      stakeOnSubnet: 0n,
    })
    expect(rows[1].role).toBe("miner") // no permit column → miner
  })
})

describe("cleanName", () => {
  it("trims and nulls blank/empty/undefined", () => {
    expect(cleanName("  Hello  ")).toBe("Hello")
    expect(cleanName("   ")).toBeNull()
    expect(cleanName("")).toBeNull()
    expect(cleanName(null)).toBeNull()
    expect(cleanName(undefined)).toBeNull()
  })
})

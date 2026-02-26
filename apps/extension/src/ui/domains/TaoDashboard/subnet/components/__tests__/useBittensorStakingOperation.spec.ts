import {
  type DecodedCall,
  extractProxyColdkey,
  findSubtensorStakeCall,
  getOperationType,
  matchesSubtensorStakeCall,
  normalizeCall,
  type PapiCall,
  type SubtensorStakeCallType,
} from "../stakingCallHelpers"

// ─── Shared fixtures ────────────────────────────────────────────────────────

const HOTKEY_A = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const HOTKEY_B = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const COLDKEY_A = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM"
const COLDKEY_B = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"

const makeDecodedCall = (
  pallet: string,
  method: string,
  args: Record<string, unknown>
): DecodedCall => ({ pallet, method, args })

const makePapiCall = (pallet: string, method: string, args: Record<string, unknown>): PapiCall => ({
  type: pallet,
  value: { type: method, value: args },
})

// ─── normalizeCall ──────────────────────────────────────────────────────────

describe("normalizeCall", () => {
  it("returns null for null/undefined/non-object inputs", () => {
    expect(normalizeCall(null)).toBeNull()
    expect(normalizeCall(undefined)).toBeNull()
    expect(normalizeCall("string")).toBeNull()
    expect(normalizeCall(123)).toBeNull()
  })

  it("passes through a DecodedCall unchanged", () => {
    const call = makeDecodedCall("SubtensorModule", "add_stake", { hotkey: HOTKEY_A, netuid: 1 })
    expect(normalizeCall(call)).toEqual(call)
  })

  it("normalizes a PapiCall to DecodedCall format", () => {
    const papiCall = makePapiCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: 1,
    })
    expect(normalizeCall(papiCall)).toEqual({
      pallet: "SubtensorModule",
      method: "add_stake",
      args: { hotkey: HOTKEY_A, netuid: 1 },
    })
  })

  it("returns null for an object that does not match either format", () => {
    expect(normalizeCall({ foo: "bar" })).toBeNull()
    // Has type but value is not an object
    expect(normalizeCall({ type: "X", value: "notAnObject" })).toBeNull()
    // Has type & value object but value has no type
    expect(normalizeCall({ type: "X", value: { data: 1 } })).toBeNull()
  })

  it("returns null for an empty object", () => {
    expect(normalizeCall({})).toBeNull()
  })
})

// ─── matchesSubtensorStakeCall ──────────────────────────────────────────────

describe("matchesSubtensorStakeCall", () => {
  // === add_stake / add_stake_limit (buy only) ===
  describe("add_stake / add_stake_limit", () => {
    const args = { hotkey: HOTKEY_A, netuid: 1, amount_staked: 1000n }

    it("matches on buy when netuid and hotkey match", () => {
      expect(matchesSubtensorStakeCall("add_stake", args, 1, HOTKEY_A, "buy")).toBe(true)
      expect(matchesSubtensorStakeCall("add_stake_limit", args, 1, HOTKEY_A, "buy")).toBe(true)
    })

    it("does not match on sell", () => {
      expect(matchesSubtensorStakeCall("add_stake", args, 1, HOTKEY_A, "sell")).toBe(false)
    })

    it("does not match if netuid differs", () => {
      expect(matchesSubtensorStakeCall("add_stake", args, 99, HOTKEY_A, "buy")).toBe(false)
    })

    it("does not match if hotkey differs", () => {
      expect(matchesSubtensorStakeCall("add_stake", args, 1, HOTKEY_B, "buy")).toBe(false)
    })
  })

  // === remove_stake / remove_stake_limit / remove_stake_full_limit (sell only) ===
  describe("remove_stake variants", () => {
    const args = { hotkey: HOTKEY_A, netuid: 1, amount_unstaked: 500n }

    for (const method of ["remove_stake", "remove_stake_limit", "remove_stake_full_limit"]) {
      it(`${method} matches on sell when netuid and hotkey match`, () => {
        expect(matchesSubtensorStakeCall(method, args, 1, HOTKEY_A, "sell")).toBe(true)
      })

      it(`${method} does not match on buy`, () => {
        expect(matchesSubtensorStakeCall(method, args, 1, HOTKEY_A, "buy")).toBe(false)
      })
    }
  })

  // === unstake_all / unstake_all_alpha (sell, hotkey only) ===
  describe("unstake_all variants", () => {
    const args = { hotkey: HOTKEY_A }

    for (const method of ["unstake_all", "unstake_all_alpha"]) {
      it(`${method} matches on sell when hotkey matches (no netuid check)`, () => {
        expect(matchesSubtensorStakeCall(method, args, 999, HOTKEY_A, "sell")).toBe(true)
      })

      it(`${method} does not match on buy`, () => {
        expect(matchesSubtensorStakeCall(method, args, 1, HOTKEY_A, "buy")).toBe(false)
      })

      it(`${method} does not match if hotkey differs`, () => {
        expect(matchesSubtensorStakeCall(method, args, 1, HOTKEY_B, "sell")).toBe(false)
      })
    }
  })

  // === move_stake (directional) ===
  describe("move_stake", () => {
    const args = {
      origin_hotkey: HOTKEY_A,
      destination_hotkey: HOTKEY_B,
      origin_netuid: 1,
      destination_netuid: 2,
      alpha_amount: 100n,
    }

    it("matches sell side (origin)", () => {
      expect(matchesSubtensorStakeCall("move_stake", args, 1, HOTKEY_A, "sell")).toBe(true)
    })

    it("matches buy side (destination)", () => {
      expect(matchesSubtensorStakeCall("move_stake", args, 2, HOTKEY_B, "buy")).toBe(true)
    })

    it("does not match sell side with destination params", () => {
      expect(matchesSubtensorStakeCall("move_stake", args, 2, HOTKEY_B, "sell")).toBe(false)
    })

    it("does not match buy side with origin params", () => {
      expect(matchesSubtensorStakeCall("move_stake", args, 1, HOTKEY_A, "buy")).toBe(false)
    })
  })

  // === transfer_stake (directional) ===
  describe("transfer_stake", () => {
    const args = {
      destination_coldkey: COLDKEY_B,
      hotkey: HOTKEY_A,
      origin_netuid: 1,
      destination_netuid: 2,
      alpha_amount: 100n,
    }

    it("matches sell side (origin)", () => {
      expect(matchesSubtensorStakeCall("transfer_stake", args, 1, HOTKEY_A, "sell")).toBe(true)
    })

    it("matches buy side (destination)", () => {
      expect(matchesSubtensorStakeCall("transfer_stake", args, 2, HOTKEY_A, "buy")).toBe(true)
    })
  })

  // === swap_stake / swap_stake_limit (directional) ===
  describe("swap_stake variants", () => {
    const args = {
      hotkey: HOTKEY_A,
      origin_netuid: 1,
      destination_netuid: 2,
      alpha_amount: 100n,
    }

    for (const method of ["swap_stake", "swap_stake_limit"]) {
      it(`${method} matches sell side (origin)`, () => {
        expect(matchesSubtensorStakeCall(method, args, 1, HOTKEY_A, "sell")).toBe(true)
      })

      it(`${method} matches buy side (destination)`, () => {
        expect(matchesSubtensorStakeCall(method, args, 2, HOTKEY_A, "buy")).toBe(true)
      })
    }
  })

  // === Unknown method ===
  it("returns false for unknown methods", () => {
    expect(
      matchesSubtensorStakeCall(
        "unknown_method",
        { hotkey: HOTKEY_A, netuid: 1 },
        1,
        HOTKEY_A,
        "buy"
      )
    ).toBe(false)
  })
})

// ─── extractProxyColdkey ────────────────────────────────────────────────────

describe("extractProxyColdkey", () => {
  it("extracts a string directly", () => {
    expect(extractProxyColdkey(COLDKEY_A)).toBe(COLDKEY_A)
  })

  it("extracts from an object with a string value property", () => {
    expect(extractProxyColdkey({ value: COLDKEY_A })).toBe(COLDKEY_A)
  })

  it("returns null for an object where value is not a string", () => {
    expect(extractProxyColdkey({ value: 123 })).toBeNull()
  })

  it("returns null for null/undefined/number", () => {
    expect(extractProxyColdkey(null)).toBeNull()
    expect(extractProxyColdkey(undefined)).toBeNull()
    expect(extractProxyColdkey(42)).toBeNull()
  })

  it("returns null for an empty object", () => {
    expect(extractProxyColdkey({})).toBeNull()
  })
})

// ─── getOperationType ───────────────────────────────────────────────────────

describe("getOperationType", () => {
  const makeCall = (method: SubtensorStakeCallType, args: Record<string, unknown> = {}) =>
    ({ pallet: "SubtensorModule", method, args }) as DecodedCall & {
      method: SubtensorStakeCallType
    }

  it('returns "stake" for add_stake', () => {
    expect(getOperationType(makeCall("add_stake"))).toBe("stake")
  })

  it('returns "stake_limit" for add_stake_limit', () => {
    expect(getOperationType(makeCall("add_stake_limit"))).toBe("stake_limit")
  })

  it('returns "unstake" for remove_stake', () => {
    expect(getOperationType(makeCall("remove_stake"))).toBe("unstake")
  })

  it('returns "unstake_limit" for remove_stake_limit and remove_stake_full_limit', () => {
    expect(getOperationType(makeCall("remove_stake_limit"))).toBe("unstake_limit")
    expect(getOperationType(makeCall("remove_stake_full_limit"))).toBe("unstake_limit")
  })

  it('returns "unstake_all" for unstake_all variants', () => {
    expect(getOperationType(makeCall("unstake_all"))).toBe("unstake_all")
    expect(getOperationType(makeCall("unstake_all_alpha"))).toBe("unstake_all")
  })

  describe("move_stake", () => {
    it('returns "change_subnet" when netuids differ', () => {
      expect(
        getOperationType(
          makeCall("move_stake", {
            origin_netuid: 1,
            destination_netuid: 2,
            origin_hotkey: HOTKEY_A,
            destination_hotkey: HOTKEY_A,
          })
        )
      ).toBe("change_subnet")
    })

    it('returns "change_validator" when hotkeys differ but netuids are same', () => {
      expect(
        getOperationType(
          makeCall("move_stake", {
            origin_netuid: 1,
            destination_netuid: 1,
            origin_hotkey: HOTKEY_A,
            destination_hotkey: HOTKEY_B,
          })
        )
      ).toBe("change_validator")
    })

    it('returns "change_subnet" with priority when both netuid and hotkey change', () => {
      expect(
        getOperationType(
          makeCall("move_stake", {
            origin_netuid: 1,
            destination_netuid: 2,
            origin_hotkey: HOTKEY_A,
            destination_hotkey: HOTKEY_B,
          })
        )
      ).toBe("change_subnet")
    })

    it('returns "unknown" when both netuid and hotkey are same', () => {
      expect(
        getOperationType(
          makeCall("move_stake", {
            origin_netuid: 1,
            destination_netuid: 1,
            origin_hotkey: HOTKEY_A,
            destination_hotkey: HOTKEY_A,
          })
        )
      ).toBe("unknown")
    })
  })

  describe("transfer_stake", () => {
    it('returns "change_subnet" when netuids differ', () => {
      expect(
        getOperationType(makeCall("transfer_stake", { origin_netuid: 1, destination_netuid: 2 }))
      ).toBe("change_subnet")
    })

    it('returns "transfer" when netuids are same', () => {
      expect(
        getOperationType(makeCall("transfer_stake", { origin_netuid: 1, destination_netuid: 1 }))
      ).toBe("transfer")
    })
  })

  it('returns "change_subnet" for swap_stake and swap_stake_limit', () => {
    expect(getOperationType(makeCall("swap_stake"))).toBe("change_subnet")
    expect(getOperationType(makeCall("swap_stake_limit"))).toBe("change_subnet")
  })
})

// ─── findSubtensorStakeCall ─────────────────────────────────────────────────

describe("findSubtensorStakeCall", () => {
  const NETUID = 1

  // --- Direct call matching ---

  it("finds a direct SubtensorModule add_stake call", () => {
    const call = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
      amount_staked: 1000n,
    })
    const result = findSubtensorStakeCall(call, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
  })

  it("finds a direct SubtensorModule remove_stake call", () => {
    const call = makeDecodedCall("SubtensorModule", "remove_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
      amount_unstaked: 500n,
    })
    const result = findSubtensorStakeCall(call, NETUID, HOTKEY_A, COLDKEY_A, "sell")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("remove_stake")
  })

  it("returns null for a non-matching direct call", () => {
    const call = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_B,
      netuid: 99,
    })
    const result = findSubtensorStakeCall(call, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).toBeNull()
  })

  it("returns null for a completely unrelated pallet", () => {
    const call = makeDecodedCall("Balances", "transfer", { dest: HOTKEY_A, value: 100n })
    const result = findSubtensorStakeCall(call, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).toBeNull()
  })

  it("returns null for null input", () => {
    expect(findSubtensorStakeCall(null, NETUID, HOTKEY_A, COLDKEY_A, "buy")).toBeNull()
  })

  // --- PAPI format ---

  it("finds a call in PAPI format", () => {
    const call = makePapiCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const result = findSubtensorStakeCall(call, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
    // Should be normalized to DecodedCall format
    expect(result?.pallet).toBe("SubtensorModule")
  })

  // --- Proxy wrapper ---

  it("unwraps Proxy.proxy and finds nested SubtensorModule call", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const proxy = makeDecodedCall("Proxy", "proxy", {
      real: COLDKEY_A,
      call: inner,
    })
    const result = findSubtensorStakeCall(proxy, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
  })

  it("unwraps Proxy.proxy_announced and finds nested SubtensorModule call", () => {
    const inner = makeDecodedCall("SubtensorModule", "remove_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const proxy = makeDecodedCall("Proxy", "proxy_announced", {
      real: COLDKEY_A,
      call: inner,
    })
    const result = findSubtensorStakeCall(proxy, NETUID, HOTKEY_A, COLDKEY_A, "sell")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("remove_stake")
  })

  it("rejects Proxy.proxy when proxy coldkey does not match target coldkey", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const proxy = makeDecodedCall("Proxy", "proxy", {
      real: COLDKEY_B, // Different coldkey
      call: inner,
    })
    const result = findSubtensorStakeCall(proxy, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).toBeNull()
  })

  it("handles proxy with object-style real field", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const proxy = makeDecodedCall("Proxy", "proxy", {
      real: { value: COLDKEY_A },
      call: inner,
    })
    const result = findSubtensorStakeCall(proxy, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
  })

  // --- Utility batch wrapper ---

  it("unwraps Utility.batch and finds the matching call", () => {
    const matchingCall = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const otherCall = makeDecodedCall("Balances", "transfer", { dest: HOTKEY_B, value: 100n })
    const batch = makeDecodedCall("Utility", "batch", {
      calls: [otherCall, matchingCall],
    })
    const result = findSubtensorStakeCall(batch, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
  })

  it("unwraps Utility.batch_all", () => {
    const inner = makeDecodedCall("SubtensorModule", "remove_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const batch = makeDecodedCall("Utility", "batch_all", { calls: [inner] })
    const result = findSubtensorStakeCall(batch, NETUID, HOTKEY_A, COLDKEY_A, "sell")
    expect(result?.method).toBe("remove_stake")
  })

  it("unwraps Utility.force_batch", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const batch = makeDecodedCall("Utility", "force_batch", { calls: [inner] })
    const result = findSubtensorStakeCall(batch, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result?.method).toBe("add_stake")
  })

  // --- Utility.as_derivative / dispatch_as / with_weight ---

  it("unwraps Utility.as_derivative", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const wrapper = makeDecodedCall("Utility", "as_derivative", { index: 0, call: inner })
    const result = findSubtensorStakeCall(wrapper, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result?.method).toBe("add_stake")
  })

  it("unwraps Utility.with_weight", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const wrapper = makeDecodedCall("Utility", "with_weight", { call: inner, weight: {} })
    const result = findSubtensorStakeCall(wrapper, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result?.method).toBe("add_stake")
  })

  // --- Multisig wrapper ---

  it("unwraps Multisig.as_multi", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const multisig = makeDecodedCall("Multisig", "as_multi", {
      threshold: 2,
      call: inner,
    })
    const result = findSubtensorStakeCall(multisig, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result?.method).toBe("add_stake")
  })

  // --- Scheduler wrapper ---

  it("unwraps Scheduler.schedule", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const scheduler = makeDecodedCall("Scheduler", "schedule", {
      when: 100,
      call: inner,
    })
    const result = findSubtensorStakeCall(scheduler, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result?.method).toBe("add_stake")
  })

  // --- Sudo wrapper ---

  it("unwraps Sudo.sudo", () => {
    const inner = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const sudo = makeDecodedCall("Sudo", "sudo", { call: inner })
    const result = findSubtensorStakeCall(sudo, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result?.method).toBe("add_stake")
  })

  // --- Deeply nested: Proxy > Batch > SubtensorModule ---

  it("finds a call through Proxy > Batch nesting", () => {
    const stakeCall = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const batch = makeDecodedCall("Utility", "batch", { calls: [stakeCall] })
    const proxy = makeDecodedCall("Proxy", "proxy", {
      real: COLDKEY_A,
      call: batch,
    })
    const result = findSubtensorStakeCall(proxy, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
  })

  // --- Batch with multiple proxy calls: coldkey filtering ---

  it("selects the correct proxy call in a batch by coldkey match", () => {
    // Two proxy calls in a batch, same hotkey+netuid, different coldkeys
    const callForColdkeyA = makeDecodedCall("Proxy", "proxy", {
      real: COLDKEY_A,
      call: makeDecodedCall("SubtensorModule", "add_stake", {
        hotkey: HOTKEY_A,
        netuid: NETUID,
      }),
    })
    const callForColdkeyB = makeDecodedCall("Proxy", "proxy", {
      real: COLDKEY_B,
      call: makeDecodedCall("SubtensorModule", "add_stake", {
        hotkey: HOTKEY_A,
        netuid: NETUID,
      }),
    })
    const batch = makeDecodedCall("Utility", "batch", {
      calls: [callForColdkeyB, callForColdkeyA],
    })

    // Should find the call for COLDKEY_A, not COLDKEY_B
    const result = findSubtensorStakeCall(batch, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
  })

  it("returns null from a batch when no proxy coldkey matches", () => {
    const callForColdkeyB = makeDecodedCall("Proxy", "proxy", {
      real: COLDKEY_B,
      call: makeDecodedCall("SubtensorModule", "add_stake", {
        hotkey: HOTKEY_A,
        netuid: NETUID,
      }),
    })
    const batch = makeDecodedCall("Utility", "batch", {
      calls: [callForColdkeyB],
    })

    const result = findSubtensorStakeCall(batch, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).toBeNull()
  })

  // --- Mixed PAPI nested inside DecodedCall wrapper ---

  it("handles mixed PAPI/DecodedCall nesting", () => {
    const papiInner = makePapiCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    const batch = makeDecodedCall("Utility", "batch", { calls: [papiInner] })
    const result = findSubtensorStakeCall(batch, NETUID, HOTKEY_A, COLDKEY_A, "buy")
    expect(result).not.toBeNull()
    expect(result?.method).toBe("add_stake")
  })

  // --- Without effectiveColdkey, direct SubtensorModule calls match any coldkey ---

  it("matches direct SubtensorModule call regardless of targetColdkey when not inside proxy", () => {
    const call = makeDecodedCall("SubtensorModule", "add_stake", {
      hotkey: HOTKEY_A,
      netuid: NETUID,
    })
    // Even though we pass COLDKEY_B as target, there's no proxy context, so coldkey is not checked
    const result = findSubtensorStakeCall(call, NETUID, HOTKEY_A, COLDKEY_B, "buy")
    expect(result).not.toBeNull()
  })
})

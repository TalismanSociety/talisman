import type { BondOption } from "@ui/domains/Staking/hooks/bittensor/types"
import { describe, expect, test } from "vitest"
import { sortValidatorOptions } from "../validatorSorting"

const createOption = (overrides: Partial<BondOption>): BondOption => ({
  hotkey: "5Default",
  name: "",
  totalStaked: 0,
  totalStakers: 0,
  hasData: true,
  isError: false,
  isFeatured: false,
  featuredOrder: -1,
  apr: 0,
  subnets: 0,
  rank: 0,
  ...overrides,
})

describe("sortValidatorOptions", () => {
  test("featured validators appear in config order, non-featured sorted by composite metric", () => {
    const validators: BondOption[] = [
      createOption({
        hotkey: "5A",
        name: "A",
        isFeatured: true,
        featuredOrder: 0,
        apr: 0.1,
        totalStaked: 10,
        totalStakers: 5,
      }),
      createOption({
        hotkey: "5B",
        name: "B",
        isFeatured: false,
        apr: 0.4,
        totalStaked: 200,
        totalStakers: 50,
      }),
      createOption({
        hotkey: "5C",
        name: "C",
        isFeatured: true,
        featuredOrder: 1,
        apr: 0.25,
        totalStaked: 50,
        totalStakers: 20,
      }),
      createOption({
        hotkey: "5D",
        name: "D",
        isFeatured: false,
        apr: 0.3,
        totalStaked: 100,
        totalStakers: 30,
      }),
    ]

    const sorted = sortValidatorOptions(validators, "featured")

    // featured first in config order (A=0, C=1), then non-featured by totalStaked desc (B=200, D=100)
    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5A", "5C", "5B", "5D"])
  })

  test("non-featured validators with zero metric sort by name", () => {
    const validators: BondOption[] = [
      createOption({ hotkey: "5A", name: "Zebra" }),
      createOption({ hotkey: "5B", name: "Alpha" }),
    ]

    const sorted = sortValidatorOptions(validators, "featured")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5B", "5A"])
  })

  test("keeps validators with yield data first for non-featured sort modes", () => {
    const validators: BondOption[] = [
      createOption({ hotkey: "5A", name: "Alice" }),
      createOption({
        hotkey: "5B",
        name: "Bob",
        validatorYield: { hotkey: "5B", stake: 10, thirty_day_apy: null },
      }),
      createOption({ hotkey: "5C", name: "Charlie" }),
    ]

    const sorted = sortValidatorOptions(validators, "name")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5B", "5A", "5C"])
  })

  test("sorts by totalStaked descending with name tiebreaker", () => {
    const validators: BondOption[] = [
      createOption({ hotkey: "5A", name: "Alpha", totalStaked: 100 }),
      createOption({ hotkey: "5B", name: "Beta", totalStaked: 300 }),
      createOption({ hotkey: "5C", name: "Charlie", totalStaked: 100 }),
    ]

    const sorted = sortValidatorOptions(validators, "totalStaked")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5B", "5A", "5C"])
  })

  test("sorts by totalStakers descending", () => {
    const validators: BondOption[] = [
      createOption({ hotkey: "5A", name: "A", totalStakers: 10 }),
      createOption({ hotkey: "5B", name: "B", totalStakers: 50 }),
      createOption({ hotkey: "5C", name: "C", totalStakers: 30 }),
    ]

    const sorted = sortValidatorOptions(validators, "totalStakers")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5B", "5C", "5A"])
  })

  test("sorts by apr descending", () => {
    const validators: BondOption[] = [
      createOption({ hotkey: "5A", name: "A", apr: 0.05 }),
      createOption({ hotkey: "5B", name: "B", apr: 0.2 }),
      createOption({ hotkey: "5C", name: "C", apr: 0.1 }),
    ]

    const sorted = sortValidatorOptions(validators, "apr")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5B", "5C", "5A"])
  })

  test("does not mutate original array", () => {
    const validators: BondOption[] = [
      createOption({ hotkey: "5B", name: "B" }),
      createOption({ hotkey: "5A", name: "A" }),
    ]
    const original = [...validators]

    sortValidatorOptions(validators, "name")

    expect(validators.map(({ hotkey }) => hotkey)).toEqual(original.map(({ hotkey }) => hotkey))
  })
})

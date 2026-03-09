import type { BondOption } from "@ui/domains/Staking/hooks/bittensor/types"

import { sortValidatorOptions } from "../validatorSorting"

const createOption = (overrides: Partial<BondOption>): BondOption => ({
  hotkey: "5Default",
  name: "",
  totalStaked: 0,
  totalStakers: 0,
  hasData: true,
  isError: false,
  isFeatured: false,
  apr: 0,
  subnets: 0,
  rank: 0,
  ...overrides,
})

describe("sortValidatorOptions", () => {
  test("sorts featured validators to the top, then orders each group by 30-day APY", () => {
    const validators: BondOption[] = [
      createOption({
        hotkey: "5A",
        name: "A",
        isFeatured: true,
        validatorYield: { hotkey: "5A", stake: 10, thirty_day_apy: 0.1 },
      }),
      createOption({
        hotkey: "5B",
        name: "B",
        isFeatured: false,
        validatorYield: { hotkey: "5B", stake: 200, thirty_day_apy: 0.4 },
      }),
      createOption({
        hotkey: "5C",
        name: "C",
        isFeatured: true,
        validatorYield: { hotkey: "5C", stake: 50, thirty_day_apy: 0.25 },
      }),
      createOption({
        hotkey: "5D",
        name: "D",
        isFeatured: false,
        validatorYield: { hotkey: "5D", stake: 100, thirty_day_apy: 0.3 },
      }),
    ]

    const sorted = sortValidatorOptions(validators, "featured")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5C", "5A", "5B", "5D"])
  })

  test("keeps validators with missing APY after validators with APY in each featured group", () => {
    const validators: BondOption[] = [
      createOption({
        hotkey: "5A",
        isFeatured: true,
        validatorYield: { hotkey: "5A", stake: 10, thirty_day_apy: 0.1 },
      }),
      createOption({
        hotkey: "5B",
        isFeatured: true,
        validatorYield: { hotkey: "5B", stake: 60, thirty_day_apy: null },
      }),
      createOption({
        hotkey: "5C",
        isFeatured: false,
        validatorYield: { hotkey: "5C", stake: 120, thirty_day_apy: 0.05 },
      }),
      createOption({ hotkey: "5D", isFeatured: false }),
    ]

    const sorted = sortValidatorOptions(validators, "featured")

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5A", "5B", "5C", "5D"])
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

  test("can prioritize featured validators on top for non-featured sort modes", () => {
    const validators: BondOption[] = [
      createOption({
        hotkey: "5A",
        name: "Alpha",
        isFeatured: false,
        validatorYield: { hotkey: "5A", stake: 1, thirty_day_apy: 0.1 },
      }),
      createOption({
        hotkey: "5B",
        name: "Bravo",
        isFeatured: true,
        validatorYield: { hotkey: "5B", stake: 1, thirty_day_apy: 0.1 },
      }),
      createOption({
        hotkey: "5C",
        name: "Charlie",
        isFeatured: false,
        validatorYield: { hotkey: "5C", stake: 1, thirty_day_apy: 0.1 },
      }),
      createOption({
        hotkey: "5D",
        name: "Delta",
        isFeatured: true,
        validatorYield: { hotkey: "5D", stake: 1, thirty_day_apy: 0.1 },
      }),
    ]

    const sorted = sortValidatorOptions(validators, "name", { prioritizeFeatured: true })

    expect(sorted.map(({ hotkey }) => hotkey)).toEqual(["5B", "5D", "5A", "5C"])
  })
})

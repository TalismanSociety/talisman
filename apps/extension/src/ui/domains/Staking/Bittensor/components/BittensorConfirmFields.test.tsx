import type { Balance } from "@talismn/balances"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeBalance, makeToken } from "../../../Asset/__tests__/tokenPickerFixtures"
import { BittensorConfirmTalismanFeeLabel } from "./BittensorConfirmFields"

const SEEK = 10n ** 18n

const seekStaked = vi.hoisted(() => ({
  current: { planck: 0n, isLoading: false, isError: false },
}))
const subnetFee = vi.hoisted(() => ({ current: 0.3 }))
const ownedBalances = vi.hoisted(() => ({ current: [] as Balance[] }))

const seekToken = makeToken("seek", "SEEK")
const otherToken = makeToken("other", "OTH")

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))
vi.mock("@ui/state/remoteConfig", () => ({
  useFeatureFlag: () => true,
  useRemoteConfig: () => ({
    seek: {
      tokenId: "seek",
      discountTiers: [
        { tier: 0, min: "0", discount: 0 },
        { tier: 1, min: (200n * SEEK).toString(), discount: 0.05 },
        { tier: 2, min: (1000n * SEEK).toString(), discount: 0.15 },
      ],
    },
  }),
}))
vi.mock("@ui/domains/Staking/Seek/hooks/useGetSeekStaked", () => ({
  useGetSeekStaked: () => ({
    data: { balances: [], totalStaked: { planck: seekStaked.current.planck } },
    isLoading: seekStaked.current.isLoading,
    isError: seekStaked.current.isError,
    refetch: vi.fn(),
  }),
}))
vi.mock("@ui/state/balances", async () => {
  const { Balances } = await import("@talismn/balances")
  return { useBalances: () => new Balances(ownedBalances.current) }
})
vi.mock("@ui/domains/Staking/Bittensor/hooks/useGetSubnetFee", () => ({
  useGetSubnetFee: () => subnetFee.current,
}))
vi.mock("@ui/domains/Staking/Seek/SeekGetFeeDiscountsDrawer", () => ({
  SeekGetFeeDiscountsDrawer: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>SEEK drawer</div> : null,
}))

const renderLabel = () =>
  render(
    <BittensorConfirmTalismanFeeLabel
      netuid={1}
      containerId="container"
      direction="taoToAlpha"
      onCloseModal={vi.fn()}
    />
  )

const pillText = /Get Discount|Off Fees/

describe("BittensorConfirmTalismanFeeLabel SEEK discount pill", () => {
  beforeEach(() => {
    seekStaked.current = { planck: 0n, isLoading: false, isError: false }
    subnetFee.current = 0.3
    ownedBalances.current = []
  })
  afterEach(cleanup)

  it("is hidden without SEEK", () => {
    const { queryByText } = renderLabel()

    expect(queryByText(pillText)).toBeNull()
  })

  it("is hidden without SEEK when the subnet discounts its fee", () => {
    subnetFee.current = 0.15

    const { queryByText } = renderLabel()

    expect(queryByText(pillText)).toBeNull()
  })

  it("is hidden when the wallet holds other tokens and an empty SEEK balance", () => {
    ownedBalances.current = [makeBalance(otherToken, 5), makeBalance(seekToken, 0)]

    const { queryByText } = renderLabel()

    expect(queryByText(pillText)).toBeNull()
  })

  it("offers the discount drawer with SEEK held but not staked", () => {
    ownedBalances.current = [makeBalance(seekToken, 50)]

    const { getByText } = renderLabel()
    fireEvent.click(getByText("Get Discount"))

    expect(getByText("SEEK drawer")).toBeTruthy()
  })

  it("shows with SEEK held while the staked SEEK loads", () => {
    ownedBalances.current = [makeBalance(seekToken, 50)]
    seekStaked.current = { planck: 0n, isLoading: true, isError: false }

    const { getByText } = renderLabel()

    expect(getByText("Get Discount")).toBeTruthy()
  })

  it("is hidden while the staked SEEK loads", () => {
    seekStaked.current = { planck: 0n, isLoading: true, isError: false }

    const { queryByText } = renderLabel()

    expect(queryByText(pillText)).toBeNull()
  })

  it("is hidden when the staked SEEK fails to load", () => {
    seekStaked.current = { planck: 500n * SEEK, isLoading: false, isError: true }

    const { queryByText } = renderLabel()

    expect(queryByText(pillText)).toBeNull()
  })

  it("offers the discount drawer with SEEK staked below the first tier", () => {
    seekStaked.current = { planck: 50n * SEEK, isLoading: false, isError: false }

    const { getByText, queryByText } = renderLabel()
    expect(queryByText("SEEK drawer")).toBeNull()

    fireEvent.click(getByText("Get Discount"))

    expect(getByText("SEEK drawer")).toBeTruthy()
  })

  it("shows the tier discount with SEEK staked in a tier", () => {
    seekStaked.current = { planck: 500n * SEEK, isLoading: false, isError: false }

    const { getByText } = renderLabel()

    expect(getByText("5% Off Fees")).toBeTruthy()
  })

  it("adds the subnet discount to the tier discount", () => {
    seekStaked.current = { planck: 1500n * SEEK, isLoading: false, isError: false }
    subnetFee.current = 0.15

    const { getByText } = renderLabel()

    expect(getByText("65% Off Fees")).toBeTruthy()
  })
})

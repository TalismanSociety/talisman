import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SeekGetFeeDiscountsDrawer } from "./SeekGetFeeDiscountsDrawer"

const openSwapModal = vi.hoisted(() => vi.fn())
const openSeekStakingModal = vi.hoisted(() => vi.fn())

vi.mock("@talismn/icons", () => ({ ArrowRightIcon: () => null, CloseIcon: () => null }))
vi.mock("@ui/api/track", () => ({ track: vi.fn() }))
vi.mock("@ui/domains/Swap/hooks/useSwapModal", () => ({
  useSwapModal: () => ({ open: openSwapModal }),
}))
vi.mock("@ui/domains/Earn/seek/useSeekStakingModal", () => ({
  useSeekStakingModal: () => ({ open: openSeekStakingModal }),
}))
vi.mock("@ui/state/remoteConfig", () => ({
  useRemoteConfig: () => ({ seek: { tokenId: "1:erc20:0xseek", docsUrl: "https://seek.docs" } }),
}))
vi.mock("@ui/state/chaindata", () => ({ useToken: () => null }))
vi.mock("@ui/state/balances", () => ({ useBalances: () => ({ count: 0 }) }))
vi.mock("@ui/state/accounts", () => ({ useAccounts: () => [] }))
vi.mock("@ui/domains/Asset/Tokens", () => ({ Tokens: () => null }))
vi.mock("./hooks/useGetSeekStaked", () => ({
  useGetSeekStaked: () => ({ data: { totalStaked: { planck: 0n, tokens: "0" } } }),
}))
vi.mock("./hooks/useGetSeekDiscount", () => ({
  useGetSeekDiscount: () => ({ tier: { discount: 0 } }),
}))

describe("SeekGetFeeDiscountsDrawer", () => {
  afterEach(cleanup)

  it("closes the parent modal before it opens the swap", () => {
    const onCloseModal = vi.fn()
    const { getByRole } = render(
      <SeekGetFeeDiscountsDrawer
        isOpen
        containerId={undefined}
        onDismiss={vi.fn()}
        onCloseModal={onCloseModal}
      />
    )

    fireEvent.click(getByRole("button", { name: "Buy SEEK" }))

    expect(onCloseModal).toHaveBeenCalledOnce()
    expect(openSwapModal).toHaveBeenCalledWith({ entry: "seek", toTokenId: "1:erc20:0xseek" })
    expect(onCloseModal.mock.invocationCallOrder[0]).toBeLessThan(
      openSwapModal.mock.invocationCallOrder[0]
    )
  })
})

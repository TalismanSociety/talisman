import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const useSwapMock = vi.fn()
const useTokenMock = vi.fn()
const availableBalanceMock = vi.fn(({ onMaxClick }: { onMaxClick?: () => void }) => (
  <button type="button" onClick={onMaxClick} disabled={!onMaxClick}>
    Max
  </button>
))

vi.mock("react-i18next", () => ({
  Trans: ({ children }: { children: ReactNode }) => children,
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@talismn/balances-react", () => ({
  useSyncSwapsChaindata: vi.fn(),
}))

vi.mock("@core/domains/keyring/exports", () => ({}))

vi.mock("@ui/components/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock("@ui/state/accounts", () => ({
  useAccountsMap: vi.fn(() => ({})),
}))

vi.mock("@ui/state/chaindata", () => ({
  useNetworkById: vi.fn(() => ({ name: "Ethereum" })),
  useToken: (...args: unknown[]) => useTokenMock(...args),
}))

vi.mock("../SwapProvider", () => ({
  useSwap: () => useSwapMock(),
}))

vi.mock("../components/AvailableBalance", () => ({
  AvailableBalance: (props: { onMaxClick?: () => void }) => availableBalanceMock(props),
}))

vi.mock("../components/InputFromAmount", () => ({
  InputFromAmount: () => <div />,
}))

vi.mock("../components/ReverseButton", () => ({
  ReverseButton: () => <div />,
}))

vi.mock("../components/SelectTokenButton", () => ({
  SelectTokenButton: () => <div />,
}))

vi.mock("../components/SeparatedAccountSelector", () => ({
  SeparatedAccountSelector: () => <div />,
}))

vi.mock("../components/SwapProviderPickerButton", () => ({
  SwapProviderPickerButton: () => <div />,
}))

vi.mock("../components/ToAmountDisplay", () => ({
  ToAmountDisplay: () => <div />,
}))

vi.mock("../components/TokenAndAmountContainer", () => ({
  TokenAndAmountContainer: ({ accountBalance }: { accountBalance: ReactNode }) => (
    <div>{accountBalance}</div>
  ),
}))

// eslint-disable-next-line import/first
import { SwapForm } from "../components/SwapForm"

const createSwapState = (overrides: Record<string, unknown> = {}) => ({
  swapView: "form" as const,
  fromBalance: { transferable: { planck: 100n } },
  toBalance: { transferable: { planck: 50n } },
  setSwapView: vi.fn(),
  selectedQuote: {},
  fromAddress: "0xfrom",
  fromTokenId: "from-token",
  setFromTokenId: vi.fn(),
  fromAmount: 1n,
  onMaxFromAmountClick: vi.fn(),
  toAddress: "0xto",
  toTokenId: "to-token",
  setToTokenId: vi.fn(),
  toAmount: 2n,
  fromAssetIds: [],
  toAssetIds: [],
  isLoadingQuotes: false,
  isAllQuotesSettled: true,
  sortedQuotes: [{}],
  hasQuoteError: false,
  reverse: vi.fn(),
  erc20Approval: { loading: false },
  setFromAddress: vi.fn(),
  setToAddress: vi.fn(),
  ...overrides,
})

describe("SwapForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTokenMock.mockImplementation((tokenId?: string | null) => {
      if (tokenId === "from-token")
        return { id: tokenId, platform: "ethereum", type: "evm-erc20", networkId: "1" }
      if (tokenId === "to-token")
        return { id: tokenId, platform: "ethereum", type: "evm-erc20", networkId: "1" }
      return null
    })
  })

  it("forwards provider max callback to from balance", () => {
    const onMaxFromAmountClick = vi.fn()
    useSwapMock.mockReturnValue(createSwapState({ onMaxFromAmountClick }))

    render(<SwapForm />)

    expect(availableBalanceMock).toHaveBeenCalledTimes(2)

    const fromBalanceProps = availableBalanceMock.mock.calls[0]?.[0]
    expect(fromBalanceProps.onMaxClick).toBe(onMaxFromAmountClick)

    fromBalanceProps.onMaxClick?.()
    expect(onMaxFromAmountClick).toHaveBeenCalledTimes(1)
  })

  it("keeps max disabled when provider does not expose callback", () => {
    useSwapMock.mockReturnValue(createSwapState({ onMaxFromAmountClick: undefined }))

    render(<SwapForm />)

    expect(availableBalanceMock).toHaveBeenCalledTimes(2)

    const fromBalanceProps = availableBalanceMock.mock.calls[0]?.[0]
    expect(fromBalanceProps.onMaxClick).toBeUndefined()
  })
})

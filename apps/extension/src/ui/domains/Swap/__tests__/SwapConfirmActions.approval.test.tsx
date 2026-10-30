import { quoteFromLegs } from "@core/domains/swaps/helpers"
import type { BaseQuote } from "@core/domains/swaps/types"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SwapConfirmActions } from "../components/SwapConfirmActions"

const ETH = "8453:evm-native"
const USDC = "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const APPROVAL_GAS = 100_000_000_000_000n
const BRIDGE_FEE = 2_000_000_000_000_000n

const { swap, feeCheck, sentApproval } = vi.hoisted(() => ({
  swap: { selectedQuote: null as BaseQuote | null },
  sentApproval: { current: null as { hash: string; isPending: boolean; failure?: string } | null },
  feeCheck: {
    available: 0n,
    calls: [] as Array<bigint | null>,
  },
}))

const tokens: Record<string, object> = {
  [ETH]: { id: ETH, symbol: "ETH", decimals: 18, networkId: "8453", platform: "ethereum" },
  [USDC]: { id: USDC, symbol: "USDC", decimals: 6, networkId: "8453", platform: "ethereum" },
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/{{(\w+)}}/g, (_, name: string) => options?.[name] ?? ""),
  }),
}))
vi.mock("@ui/api/track", () => ({ track: vi.fn() }))
vi.mock("@ui/components/Notifications", () => ({ notify: vi.fn() }))
vi.mock("@ui/components/ScrollContainer", () => ({
  ScrollContainer: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))
vi.mock("@ui/domains/Sign/risk-analysis/context", () => ({
  RiskAnalysisProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}))
vi.mock("@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton", () => ({
  RiskAnalysisPillButton: () => null,
  useShowRiskAnalysisPillButton: () => false,
}))
vi.mock("@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis", () => ({
  useEvmTransactionRiskAnalysis: () => undefined,
}))
vi.mock("@ui/domains/Sign/risk-analysis/solana/useSolTransactionRiskAnalysis", () => ({
  useSolTransactionRiskAnalysis: () => undefined,
}))
vi.mock("@ui/domains/Sign/TxSubmitButton/TxSubmitButton", () => ({
  TxSubmitButton: ({ label, disabled }: { label?: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      {label}
    </button>
  ),
}))
vi.mock("@ui/domains/Ethereum/useEthTransaction", () => ({
  useEthTransaction: (tx: unknown) =>
    tx
      ? {
          transaction: tx,
          txDetails: { estimatedFee: APPROVAL_GAS },
          isLoading: false,
          error: null,
          errorDetails: null,
        }
      : { transaction: undefined, txDetails: undefined, isLoading: false, error: null },
}))
vi.mock("@ui/domains/Ethereum/usePublicClient", () => ({ usePublicClient: () => undefined }))
vi.mock("@ui/domains/Ethereum/GasSettings/EthFeeSelect", () => ({ EthFeeSelect: () => null }))
vi.mock("@ui/domains/Ethereum/FeeTooltip", () => ({ FeeTooltip: () => null }))
vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({ TokensAndFiat: () => null }))
vi.mock("@ui/domains/Staking/shared/useGetFeeEstimate", () => ({
  useGetFeeEstimate: () => ({ data: undefined, isLoading: false, error: null }),
}))
vi.mock("@ui/hooks/useGetSolanaFeeEstimate", () => ({
  useGetSolanaFeeEstimate: () => ({ data: undefined, isLoading: false, error: null }),
}))
vi.mock("@ui/hooks/sapi/useScaleApi", () => ({ useScaleApi: () => ({ data: undefined }) }))
vi.mock("@ui/util/solana/useSolanaRpc", () => ({ useSolanaRpc: () => undefined }))
vi.mock("@ui/hooks/useExistentialDeposit", () => ({ useExistentialDeposit: () => null }))
vi.mock("@ui/hooks/analytics/errorShown", () => ({ useErrorShown: () => undefined }))
vi.mock("@ui/hooks/analytics/flows", () => ({ flows: {} }))
vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: () => null,
  useAccountsMap: () => ({}),
}))
vi.mock("@ui/state/balances", () => ({ useBalance: () => null }))
vi.mock("@ui/state/tokenRates", () => ({ useTokenRates: () => null }))
vi.mock("@ui/state/chaindata", () => ({
  useToken: (id?: string) => (id ? (tokens[id] ?? null) : null),
  useNetworkById: (id?: string) => (id ? { id, nativeTokenId: ETH } : null),
  useNetworksMapById: () => ({}),
}))
vi.mock("@ui/hooks/useFeeBalanceCheck", () => ({
  useFeeBalanceCheck: ({ feePlanck }: { feePlanck: bigint | null }) => {
    feeCheck.calls.push(feePlanck)
    if (feePlanck === null) return { status: "loading", feeTokenId: ETH, required: null }
    return feePlanck > feeCheck.available
      ? {
          status: "insufficient",
          feeTokenId: ETH,
          required: feePlanck,
          available: feeCheck.available,
        }
      : {
          status: "sufficient",
          feeTokenId: ETH,
          required: feePlanck,
          available: feeCheck.available,
        }
  },
}))
vi.mock("../components/SwapOtherFees", () => ({ SwapOtherFees: () => null }))
vi.mock("../components/SwapSlippageDrawer", () => ({ SwapSlippageDrawer: () => null }))
vi.mock("../hooks/useQuoteApproval", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useQuoteApproval")>()
  return {
    useQuoteApproval: () => ({ ...actual.useQuoteApproval(), ...sentApproval.current }),
  }
})
vi.mock("../hooks/useLegApprovals", () => ({ useLaterLegApprovals: () => new Set() }))
vi.mock("../hooks/useSwapConfirmation", () => ({
  useConfirmReadiness: () => true,
  useSwapPostSubmit: () => vi.fn(),
}))
vi.mock("../hooks/useSwapPlanProposal", () => ({
  useFirstLegModule: () => null,
  useSwapPlanProposal: () => ({
    fees: undefined,
    txInfo: undefined,
    isProposing: false,
    proposeError: null,
  }),
}))
vi.mock("../hooks/useSwapSlippage", () => ({
  SWAP_SLIPPAGE_DEFAULT: 0.5,
  toSlippageDecimal: (percent: number) => percent / 100,
  useSwapSlippage: () => [0.5],
}))
vi.mock("../SwapProvider", () => ({
  useSwap: () => ({
    swapView: "confirm",
    fromBalance: { transferable: { planck: 10_000_000n } },
    fromAddress: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
    toAddress: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
    fromTokenId: USDC,
    toTokenId: "10:evm-native",
    fromAmount: 1_000_000n,
    toAmount: 1n,
    selectedModule: { protocol: "lifi" },
    selectedQuote: swap.selectedQuote,
    sortedQuotes: [],
    selectedSubProtocol: "glacis",
    reversed: false,
    isQuotePicked: true,
    gotoSubmitted: vi.fn(),
    approvalCounter: 0,
    incrementApprovalCounter: vi.fn(),
    approvalHash: null,
    setApprovalHash: vi.fn(),
    erc20Approval: {
      data: {
        chainId: 8453,
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        contractAddress: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE",
        fromAddress: "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
        amount: 1_000_000n,
        step: "approve",
      },
      loading: false,
      needsRevoke: false,
    },
  }),
}))

const quoteWithBridgeFee = quoteFromLegs(
  [
    {
      protocol: "lifi",
      fromTokenId: USDC,
      toTokenId: "10:evm-native",
      signer: null,
      recipient: null,
      inputAmount: 1_000_000n,
      outputAmount: 1n,
      fees: [
        {
          name: "Bridge Fee",
          tokenId: ETH,
          amount: BigNumber(BRIDGE_FEE.toString()).shiftedBy(-18),
          additional: true,
        },
      ],
      timeInSec: 60,
    },
  ],
  {
    decentralisationScore: 1,
    protocol: "lifi",
    subProtocol: "glacis",
    providerLogo: "",
    providerName: "Glacis",
  }
)

const renderConfirmActions = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SwapConfirmActions containerId="swap-modal" />
    </QueryClientProvider>
  )

describe("SwapConfirmActions approval", () => {
  beforeEach(() => {
    swap.selectedQuote = quoteWithBridgeFee
    feeCheck.calls = []
    sentApproval.current = null
  })

  it("asks for the swap's additional fees before the approval is paid for", () => {
    feeCheck.available = APPROVAL_GAS * 2n
    renderConfirmActions()

    expect(feeCheck.calls.at(-1)).toBe(APPROVAL_GAS + BRIDGE_FEE)
    expect(screen.getByRole("button", { name: "Approve USDC" }).hasAttribute("disabled")).toBe(true)
    expect(screen.getByRole("alert").textContent).toBe(
      "Insufficient ETH to pay for transaction fees"
    )
  })

  it("allows the approval when the account covers its gas and the swap's additional fees", () => {
    feeCheck.available = APPROVAL_GAS + BRIDGE_FEE
    renderConfirmActions()

    expect(screen.getByRole("button", { name: "Approve USDC" }).hasAttribute("disabled")).toBe(
      false
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("prices a retry of a reverted approval afresh, not as the transaction that reverted", () => {
    feeCheck.available = APPROVAL_GAS + BRIDGE_FEE
    sentApproval.current = { hash: "0xaa", isPending: false, failure: "Approval reverted" }
    renderConfirmActions()

    expect(screen.getByText("Estimated TX Fee")).toBeTruthy()
  })

  it("shows a pending approval as it was sent", () => {
    feeCheck.available = APPROVAL_GAS + BRIDGE_FEE
    sentApproval.current = { hash: "0xaa", isPending: true }
    renderConfirmActions()

    expect(screen.queryByText("Estimated TX Fee")).toBeNull()
  })
})

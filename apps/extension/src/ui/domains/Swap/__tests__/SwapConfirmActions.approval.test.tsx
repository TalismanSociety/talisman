import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BuiltSwap } from "../buildSwapTransaction"
import { SwapConfirmActions } from "../components/SwapConfirmActions"
import type { BaseQuote } from "../swap-modules/common.swap-module"
import { quoteFromLegs } from "../swap-modules/helpers"

const ETH = "8453:evm-native"
const OP_ETH = "10:evm-native"
const OP_WETH = "10:evm-erc20:0x4200000000000000000000000000000000000006"
const BASE_WETH = "8453:evm-erc20:0x4200000000000000000000000000000000000006"
const ACCOUNT = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const USDC = "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
const APPROVAL_GAS = 100_000_000_000_000n
const BRIDGE_FEE = 2_000_000_000_000_000n

const { swap, feeCheck, sentApproval, held } = vi.hoisted(() => ({
  swap: { selectedQuote: null as BaseQuote | null, built: null as BuiltSwap | null },
  held: (() => {
    const balancesOf = (planckByTokenId: Record<string, bigint>, status = "live") => ({
      status,
      balances: {
        find: ({ tokenId }: { tokenId: string }) => ({
          each:
            planckByTokenId[tokenId] === undefined
              ? []
              : [{ token: { decimals: 18 }, transferable: { planck: planckByTokenId[tokenId] } }],
        }),
      },
    })
    const held = {
      balances: balancesOf({}),
      set: (planckByTokenId: Record<string, bigint>) => {
        held.balances = balancesOf(planckByTokenId)
      },
      setLoading: () => {
        held.balances = balancesOf({}, "initialising")
      },
    }
    return held
  })(),
  sentApproval: { current: null as { hash: string; isPending: boolean; failure?: string } | null },
  feeCheck: {
    available: 0n,
    calls: [] as Array<bigint | null>,
  },
}))

const tokens: Record<string, object> = {
  [ETH]: { id: ETH, symbol: "ETH", decimals: 18, networkId: "8453", platform: "ethereum" },
  [USDC]: { id: USDC, symbol: "USDC", decimals: 6, networkId: "8453", platform: "ethereum" },
  [OP_ETH]: { id: OP_ETH, symbol: "ETH", decimals: 18, networkId: "10", platform: "ethereum" },
}
const networkNames: Record<string, string> = { "8453": "Base", "10": "OP Mainnet" }

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
vi.mock("@ui/hooks/useBalancesByParams", () => ({ useBalancesByParams: () => held.balances }))
vi.mock("@ui/state/tokenRates", () => ({ useTokenRates: () => null }))
vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => tokens,
  useToken: (id?: string) => (id ? (tokens[id] ?? null) : null),
  useNetworkById: (id?: string) =>
    id ? { id, name: networkNames[id], nativeTokenId: `${id}:evm-native` } : null,
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
vi.mock("../swaps.api", () => ({ useSwapModules: () => [{ protocol: "lifi" }] }))
vi.mock("../buildSwapTransaction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../buildSwapTransaction")>()),
  buildSwapTransaction: async () => swap.built,
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
    erc20Approval: swap.built
      ? { data: null, loading: false, needsRevoke: false }
      : {
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

const quoteWithLaterLegGas = quoteFromLegs(
  [
    {
      protocol: "lifi",
      fromTokenId: USDC,
      toTokenId: OP_WETH,
      signer: ACCOUNT,
      recipient: ACCOUNT,
      inputAmount: 1_000_000n,
      outputAmount: 1n,
      fees: [],
      timeInSec: 60,
    },
    {
      protocol: "lifi",
      fromTokenId: OP_WETH,
      toTokenId: OP_ETH,
      signer: ACCOUNT,
      recipient: ACCOUNT,
      inputAmount: 1n,
      outputAmount: 1n,
      fees: [{ name: "Gas", tokenId: OP_ETH, amount: BigNumber("0.00002"), gas: true }],
      timeInSec: 30,
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

const quoteWithSameNetworkLaterLeg = quoteFromLegs(
  [
    {
      protocol: "lifi",
      fromTokenId: USDC,
      toTokenId: BASE_WETH,
      signer: ACCOUNT,
      recipient: ACCOUNT,
      inputAmount: 1_000_000n,
      outputAmount: 1n,
      fees: [],
      timeInSec: 60,
    },
    {
      protocol: "lifi",
      fromTokenId: BASE_WETH,
      toTokenId: OP_ETH,
      signer: ACCOUNT,
      recipient: ACCOUNT,
      inputAmount: 1n,
      outputAmount: 1n,
      fees: [
        {
          name: "Gas",
          tokenId: ETH,
          amount: BigNumber(APPROVAL_GAS.toString()).shiftedBy(-18),
          gas: true,
        },
      ],
      timeInSec: 30,
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
    swap.built = null
    feeCheck.calls = []
    sentApproval.current = null
    held.set({})
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

  it("holds the first signature when a later leg cannot pay its gas on its own network", () => {
    feeCheck.available = APPROVAL_GAS
    swap.selectedQuote = quoteWithLaterLegGas
    held.set({})
    renderConfirmActions()

    expect(screen.getByRole("button", { name: "Approve USDC" }).hasAttribute("disabled")).toBe(true)
    expect(screen.getByRole("alert").textContent).toBe(
      "Insufficient ETH on OP Mainnet to pay for transaction fees"
    )
  })

  it("holds the first signature until the balances a later leg pays its gas from are known", () => {
    feeCheck.available = APPROVAL_GAS
    swap.selectedQuote = quoteWithLaterLegGas
    held.setLoading()
    renderConfirmActions()

    expect(screen.getByRole("button", { name: "Approve USDC" }).hasAttribute("disabled")).toBe(true)
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("allows the first signature when every later leg can pay its gas", () => {
    feeCheck.available = APPROVAL_GAS
    swap.selectedQuote = quoteWithLaterLegGas
    held.set({ [OP_ETH]: 20_000_000_000_000n })
    renderConfirmActions()

    expect(screen.getByRole("button", { name: "Approve USDC" }).hasAttribute("disabled")).toBe(
      false
    )
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("holds the first signature when the first and a later leg cannot both pay their gas on one network", () => {
    feeCheck.available = APPROVAL_GAS
    swap.selectedQuote = quoteWithSameNetworkLaterLeg
    held.set({ [ETH]: (APPROVAL_GAS * 3n) / 2n })
    renderConfirmActions()

    expect(screen.getByRole("button", { name: "Approve USDC" }).hasAttribute("disabled")).toBe(true)
    expect(screen.getByRole("alert").textContent).toBe(
      "Insufficient ETH to pay for transaction fees"
    )
  })

  it("adds the fees the first leg was built with to a later leg's gas on the same network", async () => {
    const builtFee = APPROVAL_GAS
    feeCheck.available = APPROVAL_GAS + builtFee
    swap.selectedQuote = quoteWithSameNetworkLaterLeg
    swap.built = {
      quote: quoteWithSameNetworkLaterLeg,
      leg: {
        transaction: {
          platform: "ethereum",
          transaction: { from: ACCOUNT, to: ACCOUNT, data: "0x", chainId: 8453 },
        },
        fees: [
          {
            name: "Bridge Fee",
            tokenId: ETH,
            amount: BigNumber(builtFee.toString()).shiftedBy(-18),
            additional: true,
          },
        ],
        expectedOutput: 1n,
        txInfo: { type: "swap" },
      } as BuiltSwap["leg"],
    }
    held.set({ [ETH]: (APPROVAL_GAS * 5n) / 2n })
    renderConfirmActions()

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Insufficient ETH to pay for transaction fees"
      )
    )
    expect(screen.getByRole("button", { name: "Confirm Swap" }).hasAttribute("disabled")).toBe(true)
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

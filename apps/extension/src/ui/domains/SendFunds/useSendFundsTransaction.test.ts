import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SendFundsTransactionProps } from "./types"
import { useSendFundsTransactionDot } from "./useSendFundsTransactionDot"
import { useSendFundsTransactionEth } from "./useSendFundsTransactionEth"

const FROM = "0x1111111111111111111111111111111111111111"
const TO = "0x2222222222222222222222222222222222222222"

const mocks = vi.hoisted(() => ({
  state: {
    token: null as Record<string, unknown> | null,
    ethTransaction: {} as Record<string, unknown>,
    feeQuery: {} as Record<string, unknown>,
  },
}))
const { state } = mocks

vi.mock("@common/log", () => ({ log: { debug: vi.fn(), error: vi.fn() } }))
vi.mock("@ui/api", () => ({ api: {} }))
vi.mock("@talismn/balances", () => ({ BALANCE_MODULES: [] }))
vi.mock("@core/domains/ethereum/helpers", () => ({
  getEthTransferTransactionBase: () => ({ from: FROM, to: TO }),
}))
vi.mock("@core/domains/keyring/exports", () => ({ isAccountOwned: () => true }))
vi.mock("@ui/state/accounts", () => ({ useAccountByAddress: () => null }))
vi.mock("@ui/state/balances", () => ({
  useBalance: () => ({ transferable: { planck: 1000n } }),
}))
vi.mock("@ui/state/chaindata", () => ({
  useToken: (tokenId: string | undefined) => (tokenId === "token" ? mocks.state.token : null),
  useNetworkById: () => null,
}))
vi.mock("../Ethereum/useEthTransaction", () => ({
  useEthTransaction: () => mocks.state.ethTransaction,
}))
vi.mock("../Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis", () => ({
  useEvmTransactionRiskAnalysis: () => undefined,
}))
vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: () => ({ data: undefined, isLoading: false }),
}))
vi.mock("@ui/hooks/sapi/useSignerPayloadQuery", () => ({
  useSignerPayloadQuery: () => ({ data: undefined, isLoading: false }),
}))
vi.mock("@tanstack/react-query", () => ({ useQuery: () => mocks.state.feeQuery }))
vi.mock("./hooks/useSubstrateDryRun", () => ({ useSubstrateDryRun: () => ({}) }))
vi.mock("./hooks/useTip", () => ({ useTip: () => ({ data: "0", isLoading: false }) }))
vi.mock("./useFeeToken", () => ({ useFeeToken: () => null }))

const inputs = (isLocked: boolean): SendFundsTransactionProps => ({
  tokenId: "token",
  from: FROM,
  to: TO,
  value: "1",
  sendMax: true,
  allowReap: false,
  isLocked,
})

const ethFees = (estimatedFee: bigint) => ({
  txDetails: { estimatedFee, maxFee: estimatedFee * 2n },
  gasSettingsByPriority: { type: "legacy", fee: estimatedFee },
})

describe("useSendFundsTransactionEth", () => {
  beforeEach(() => {
    state.token = { id: "token", platform: "ethereum", type: "evm-native", networkId: "1" }
    state.ethTransaction = ethFees(10n)
  })

  it("keeps the fees on screen while the payload is locked, then follows them again", () => {
    const { result, rerender } = renderHook(
      ({ isLocked }) => useSendFundsTransactionEth(inputs(isLocked)),
      { initialProps: { isLocked: false } }
    )
    const shownFees = ethFees(10n)
    expect(result.current).toMatchObject({ ...shownFees, estimatedFee: 10n, maxAmount: "980" })

    rerender({ isLocked: true })
    state.ethTransaction = ethFees(30n)
    rerender({ isLocked: true })
    expect(result.current).toMatchObject({ ...shownFees, estimatedFee: 10n, maxAmount: "980" })

    rerender({ isLocked: false })
    expect(result.current).toMatchObject({ ...ethFees(30n), estimatedFee: 30n, maxAmount: "940" })
  })
})

describe("useSendFundsTransactionDot", () => {
  beforeEach(() => {
    state.token = { id: "token", platform: "polkadot", type: "substrate-native", networkId: "dot" }
    state.feeQuery = { data: { partialFee: "10" }, isLoading: false }
  })

  it("keeps the fee and the Send Max amount on screen while the payload is locked", () => {
    const { result, rerender } = renderHook(
      ({ isLocked }) => useSendFundsTransactionDot(inputs(isLocked)),
      { initialProps: { isLocked: false } }
    )
    expect(result.current).toMatchObject({ estimatedFee: "10", maxAmount: "990" })

    rerender({ isLocked: true })
    state.feeQuery = { data: { partialFee: "30" }, isLoading: false }
    rerender({ isLocked: true })
    expect(result.current).toMatchObject({ estimatedFee: "10", maxAmount: "990" })

    rerender({ isLocked: false })
    expect(result.current).toMatchObject({ estimatedFee: "30", maxAmount: "970" })
  })
})

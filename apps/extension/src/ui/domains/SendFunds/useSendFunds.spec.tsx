import type { Token } from "@talismn/chaindata-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SendFundsProvider, useSendFunds } from "./useSendFunds"

type FakeTransaction = {
  platform: "polkadot" | "ethereum" | "solana"
  estimatedFee?: string
  maxFee?: string
  maxAmount?: string
  tip?: string
  isLoadingTip?: boolean
  isLoadingDryRun?: boolean
  dryRun?: { available: boolean; ok: boolean; errorMessage?: string }
  error?: string | Error
  isLoading?: boolean
}

const mocks = vi.hoisted(() => ({
  state: {} as {
    wizard: {
      from: string
      to: string
      tokenId: string
      amount?: string
      allowReap?: boolean
      sendMax?: boolean
    }
    accountType: string
    tokens: Record<string, Token>
    feeTokenId: string
    transferable: Record<string, bigint>
    transaction: FakeTransaction | null
    recipientFree: bigint | null
    dtao: {
      available: bigint | null
      alphaPrice?: bigint
      minTaoTransfer: bigint
      minTaoKeep?: bigint
      recipientAcceptsLockedAlpha?: boolean
      holdGate: { isBlocked: boolean; message: string | null }
    }
  },
  set: vi.fn(),
  gotoProgress: vi.fn(),
}))

const { state } = mocks

const fakeBalance = (tokenId: string) =>
  tokenId in state.transferable
    ? {
        transferable: { planck: state.transferable[tokenId] },
        free: { planck: state.transferable[tokenId] },
      }
    : null

vi.mock("@ui/apps/popup/pages/SendFunds/context", () => ({
  useSendFundsWizard: () => ({
    ...mocks.state.wizard,
    set: mocks.set,
    gotoProgress: mocks.gotoProgress,
  }),
}))
vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: () => ({ type: mocks.state.accountType }),
}))
vi.mock("@ui/state/balances", () => ({
  useBalance: (_address: string, tokenId: string) => fakeBalance(tokenId),
  useBalancesByAddress: () => ({
    find: ({ tokenId }: { tokenId: string }) => ({ each: [fakeBalance(tokenId)].filter(Boolean) }),
  }),
  useBalancesHydrate: () => ({}),
}))
vi.mock("@ui/state/chaindata", () => ({
  useToken: (tokenId?: string) => (tokenId ? (mocks.state.tokens[tokenId] ?? null) : null),
  useTokensMap: () => mocks.state.tokens,
  useNetworkById: (networkId?: string) =>
    networkId ? { id: networkId, nativeTokenId: NATIVE_TOKEN_IDS[networkId] } : null,
}))
vi.mock("@ui/state/tokenRates", () => ({
  useTokenRates: () => null,
  useTokenRatesMap: () => ({}),
}))
vi.mock("@ui/api", () => ({
  api: {
    getBalance: async () =>
      mocks.state.recipientFree === null ? null : { free: mocks.state.recipientFree.toString() },
  },
}))
vi.mock("@talismn/balances", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@talismn/balances")>()),
  Balance: class {
    total: { planck: bigint }
    constructor(storage: { free: string }) {
      this.total = { planck: BigInt(storage.free) }
    }
  },
}))
vi.mock("./useFeeToken", () => ({
  useFeeToken: () => mocks.state.tokens[mocks.state.feeTokenId],
}))
vi.mock("./useSendFundsTransactionDot", () => ({
  useSendFundsTransactionDot: () =>
    mocks.state.transaction?.platform === "polkadot" ? mocks.state.transaction : null,
}))
vi.mock("./useSendFundsTransactionEth", () => ({
  useSendFundsTransactionEth: () =>
    mocks.state.transaction?.platform === "ethereum" ? mocks.state.transaction : null,
}))
vi.mock("./useSendFundsTransactionSol", () => ({
  useSendFundsTransactionSol: () =>
    mocks.state.transaction?.platform === "solana" ? mocks.state.transaction : null,
}))
vi.mock("./useDTaoSubnetAvailable", () => ({
  useDTaoSubnetAvailable: () => mocks.state.dtao.available,
}))
vi.mock("@ui/domains/Staking/Bittensor/hooks/useBittensorAlphaPrice", () => ({
  useBittensorAlphaPrice: () => ({ data: mocks.state.dtao.alphaPrice }),
}))
vi.mock("@ui/domains/Staking/Bittensor/hooks/useGetBittensorDefaultMinStake", () => ({
  useGetBittensorDefaultMinStake: () => mocks.state.dtao.minTaoTransfer,
}))
vi.mock("@ui/domains/Staking/Bittensor/hooks/useGetBittensorMinJoinBond", () => ({
  useGetBittensorMinJoinBond: () => ({ data: mocks.state.dtao.minTaoKeep }),
}))
vi.mock("@ui/domains/Staking/Bittensor/hooks/useGetBittensorAcceptsLockedAlpha", () => ({
  useGetBittensorAcceptsLockedAlpha: () => ({
    data: mocks.state.dtao.recipientAcceptsLockedAlpha,
  }),
}))
vi.mock("@ui/domains/Staking/Bittensor/hooks/dTao/useDTaoRootStakeHold", () => ({
  useDTaoRootStakeHoldGate: () => mocks.state.dtao.holdGate,
}))

const recipientBalanceLoaded = async () => {
  await waitFor(() =>
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.state.status)
    ).toEqual(["success"])
  )
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
}

const DOT_UNIT = 10_000_000_000n

const DOT = {
  id: "polkadot:substrate-native",
  type: "substrate-native",
  platform: "polkadot",
  networkId: "polkadot",
  symbol: "DOT",
  decimals: 10,
  existentialDeposit: DOT_UNIT.toString(),
} as unknown as Token

const AH_DOT = {
  ...DOT,
  id: "polkadot-asset-hub:substrate-native",
  networkId: "polkadot-asset-hub",
  existentialDeposit: (DOT_UNIT / 100n).toString(),
} as unknown as Token

const USDT = {
  id: "polkadot-asset-hub:substrate-assets:1984",
  type: "substrate-assets",
  platform: "polkadot",
  networkId: "polkadot-asset-hub",
  symbol: "USDT",
  decimals: 6,
  existentialDeposit: "10000",
} as unknown as Token

const ETH = {
  id: "1:evm-native",
  type: "evm-native",
  platform: "ethereum",
  networkId: "1",
  symbol: "ETH",
  decimals: 18,
} as unknown as Token

const TAO = {
  id: "bittensor:substrate-native",
  type: "substrate-native",
  platform: "polkadot",
  networkId: "bittensor",
  symbol: "TAO",
  decimals: 9,
  existentialDeposit: "500",
} as unknown as Token

const SN1 = {
  id: "bittensor:substrate-dtao:1",
  type: "substrate-dtao",
  platform: "polkadot",
  networkId: "bittensor",
  netuid: 1,
  symbol: "SN1",
  decimals: 9,
  isTransferable: true,
} as unknown as Token

const NATIVE_TOKEN_IDS: Record<string, string> = {
  polkadot: DOT.id,
  "polkadot-asset-hub": AH_DOT.id,
  1: ETH.id,
  bittensor: TAO.id,
}

const TOKENS = Object.fromEntries([DOT, AH_DOT, USDT, ETH, TAO, SN1].map((t) => [t.id, t]))

const sendDot = (amount: bigint, overrides: Partial<typeof state.wizard> = {}) => {
  state.wizard = {
    from: "alice",
    to: "bob",
    tokenId: DOT.id,
    amount: amount.toString(),
    ...overrides,
  }
}

const dotTransaction = (overrides: Partial<FakeTransaction> = {}): FakeTransaction => ({
  platform: "polkadot",
  estimatedFee: (DOT_UNIT / 100n).toString(),
  maxAmount: (99n * DOT_UNIT).toString(),
  isLoadingTip: false,
  isLoadingDryRun: false,
  dryRun: { available: true, ok: true },
  ...overrides,
})

let queryClient: QueryClient

const render = () => {
  queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SendFundsProvider>{children}</SendFundsProvider>
    </QueryClientProvider>
  )
  return renderHook(() => useSendFunds(), { wrapper }).result
}

describe("useSendFunds", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(state, {
      accountType: "keypair",
      tokens: TOKENS,
      feeTokenId: DOT.id,
      transferable: { [DOT.id]: 100n * DOT_UNIT },
      transaction: dotTransaction(),
      recipientFree: 5n * DOT_UNIT,
      dtao: {
        available: null,
        minTaoTransfer: 0n,
        holdGate: { isBlocked: false, message: null },
      },
    })
    sendDot(10n * DOT_UNIT)
  })

  it("accepts a transfer the balance covers with its fee", async () => {
    const result = render()

    await waitFor(() => expect(result.current.isValid).toBe(true))
    expect(result.current.error).toBeUndefined()
    expect(result.current.method).toBe("keep-alive")
    expect(result.current.transfer?.planck).toBe(10n * DOT_UNIT)
    expect(result.current.estimatedFee?.planck).toBe(DOT_UNIT / 100n)
    expect(result.current.txInfo).toEqual({
      type: "transfer",
      to: "bob",
      tokenId: DOT.id,
      value: (10n * DOT_UNIT).toString(),
    })
  })

  it.each([
    [{ sendMax: true }, "all"],
    [{ allowReap: true }, "allow-death"],
    [{ sendMax: true, allowReap: true }, "all"],
  ] as const)("uses the %o transfer method %s", (wizard, method) => {
    sendDot(10n * DOT_UNIT, wizard)

    expect(render().current.method).toBe(method)
  })

  describe("rejects", () => {
    it("sending from a watched account", () => {
      state.accountType = "watch-only"

      expect(render().current).toMatchObject({
        isValid: false,
        error: "Cannot send from a watched account",
      })
    })

    it("an untransferable token", () => {
      state.tokens = { ...TOKENS, [SN1.id]: { ...SN1, isTransferable: false } as Token }
      state.wizard.tokenId = SN1.id

      expect(render().current).toMatchObject({
        isValid: false,
        error: "SN1 transfers are not supported at this time",
      })
    })

    it("a transaction the builder failed on", () => {
      state.transaction = dotTransaction({ error: "Pallet not found" })

      expect(render().current).toMatchObject({ isValid: false, error: "Pallet not found" })
    })

    it("an amount above the transferable balance", () => {
      sendDot(101n * DOT_UNIT)

      expect(render().current).toMatchObject({ isValid: false, error: "Insufficient DOT" })
    })

    it("an amount whose fee the balance cannot cover", () => {
      sendDot(100n * DOT_UNIT)

      expect(render().current).toMatchObject({ isValid: false, error: "Insufficient DOT" })
    })

    it("a fee that would leave the fee token below its existential deposit", () => {
      state.wizard = { from: "alice", to: "bob", tokenId: USDT.id, amount: "1000000" }
      state.feeTokenId = AH_DOT.id
      state.transferable = { [USDT.id]: 5_000_000n, [AH_DOT.id]: DOT_UNIT / 100n + 1n }
      state.transaction = dotTransaction({ estimatedFee: "2" })

      expect(render().current).toMatchObject({
        isValid: false,
        error: "Insufficient DOT to pay for fees",
      })
    })

    it("a fee token balance below the fee", () => {
      state.wizard = { from: "alice", to: "bob", tokenId: USDT.id, amount: "1000000" }
      state.feeTokenId = AH_DOT.id
      state.transferable = { [USDT.id]: 5_000_000n, [AH_DOT.id]: 1n }

      expect(render().current).toMatchObject({ isValid: false, error: "Insufficient DOT" })
    })

    it("less than the existential deposit to an empty account", async () => {
      state.recipientFree = 0n
      sendDot(DOT_UNIT / 2n)

      const result = render()

      await waitFor(() =>
        expect(result.current).toMatchObject({
          isValid: false,
          error: "Please send a minimum of 1 DOT",
        })
      )
    })

    it("a transaction the dry run says would fail", () => {
      state.transaction = dotTransaction({
        dryRun: { available: true, ok: false, errorMessage: "Token.FundsUnavailable" },
      })

      expect(render().current).toMatchObject({
        isValid: false,
        error: "Transaction would fail: Token.FundsUnavailable",
      })
    })
  })

  it("accepts less than the existential deposit to a funded account", async () => {
    sendDot(DOT_UNIT / 2n)

    const result = render()
    await recipientBalanceLoaded()

    expect(result.current.isValid).toBe(true)
  })

  it("waits for the dry run before accepting", () => {
    state.transaction = dotTransaction({ isLoadingDryRun: true })

    expect(render().current).toMatchObject({ isValid: false, error: undefined })
  })

  describe("tokens to be reaped", () => {
    it("lists the sent token when the remainder falls below its existential deposit", () => {
      sendDot(99n * DOT_UNIT + DOT_UNIT / 2n, { allowReap: true })
      state.transaction = dotTransaction({ estimatedFee: "0" })

      const { tokensToBeReaped } = render().current

      expect(tokensToBeReaped).toHaveLength(1)
      expect(tokensToBeReaped?.[0].token.id).toBe(DOT.id)
      expect(tokensToBeReaped?.[0].amount.planck).toBe(DOT_UNIT / 2n)
    })

    it("counts fee and tip against the same token", () => {
      sendDot(99n * DOT_UNIT, { allowReap: true })
      state.transaction = dotTransaction({
        estimatedFee: (DOT_UNIT / 4n).toString(),
        tip: (DOT_UNIT / 4n).toString(),
      })

      const { tokensToBeReaped } = render().current

      expect(tokensToBeReaped?.[0].amount.planck).toBe(DOT_UNIT / 2n)
    })

    it("lists nothing when sending the whole balance", () => {
      sendDot(0n, { amount: undefined, sendMax: true })

      expect(render().current.tokensToBeReaped).toEqual([])
    })
  })

  describe("send max", () => {
    it("sends the amount the substrate transaction computed", () => {
      sendDot(0n, { amount: undefined, sendMax: true })

      const current = render().current

      expect(current.transfer?.planck).toBe(99n * DOT_UNIT)
      expect(current.maxAmount?.planck).toBe(99n * DOT_UNIT)
      expect(current.isEstimatingMaxAmount).toBe(false)
    })

    it("is estimating until the max amount is known", () => {
      sendDot(0n, { amount: undefined, sendMax: true })
      state.transaction = dotTransaction({ maxAmount: undefined })

      const current = render().current

      expect(current.transfer).toBeNull()
      expect(current.isEstimatingMaxAmount).toBe(true)
    })

    it("switches a substrate transfer to transfer_all", () => {
      render().current.onSendMaxClick()

      expect(mocks.set.mock.calls).toEqual([
        ["amount", (99n * DOT_UNIT).toString()],
        ["sendMax", true],
      ])
    })

    it("only fills in the amount on other platforms", () => {
      state.wizard = { from: "alice", to: "bob", tokenId: ETH.id, amount: "1" }
      state.feeTokenId = ETH.id
      state.transferable = { [ETH.id]: 10n ** 18n }
      state.transaction = { platform: "ethereum", estimatedFee: "1", maxFee: "2", maxAmount: "5" }

      render().current.onSendMaxClick()

      expect(mocks.set.mock.calls).toEqual([["amount", "5"]])
    })
  })

  it("budgets an EVM transfer with its max fee, not the estimate", () => {
    state.wizard = { from: "alice", to: "bob", tokenId: ETH.id, amount: "600" }
    state.feeTokenId = ETH.id
    state.transferable = { [ETH.id]: 1000n }
    state.transaction = { platform: "ethereum", estimatedFee: "100", maxFee: "500" }

    expect(render().current).toMatchObject({ isValid: false, error: "Insufficient ETH" })
  })

  describe("dtao (staked alpha)", () => {
    const ALPHA_UNIT = 1_000_000_000n

    beforeEach(() => {
      state.wizard = { from: "alice", to: "bob", tokenId: SN1.id, amount: ALPHA_UNIT.toString() }
      state.feeTokenId = TAO.id
      state.transferable = { [SN1.id]: 10n * ALPHA_UNIT, [TAO.id]: ALPHA_UNIT }
      state.transaction = dotTransaction({ estimatedFee: "100000", maxAmount: undefined })
      state.recipientFree = null
      // 1 alpha = 0.5 TAO, as a 1e9 fixed-point price
      state.dtao.alphaPrice = 500_000_000n
    })

    it("rejects a transfer worth less than the chain's minimum stake", () => {
      state.dtao.minTaoTransfer = ALPHA_UNIT

      expect(render().current).toMatchObject({
        isValid: false,
        error: "Minimum transfer is 2 SN1",
      })
    })

    it("rejects a remainder the chain would sweep", () => {
      state.dtao.minTaoKeep = 5n * ALPHA_UNIT

      expect(render().current).toMatchObject({
        isValid: false,
        error: "Send everything or keep at least 10 SN1",
      })
    })

    it("warns when the transfer moves locked stake to a recipient who accepts it", () => {
      state.dtao.available = ALPHA_UNIT / 2n
      state.dtao.recipientAcceptsLockedAlpha = true

      const current = render().current

      expect(current.dtaoLockedTransferWarning).toBe(true)
      expect(current.isValid).toBe(true)
    })

    it("blocks locked stake to a recipient who rejects it", () => {
      state.dtao.available = ALPHA_UNIT / 2n
      state.dtao.recipientAcceptsLockedAlpha = false

      expect(render().current).toMatchObject({
        isValid: false,
        error: "Recipient hasn't opted in to receive locked stake",
        dtaoLockedTransferWarning: false,
      })
    })

    it("blocks while the root stake is on hold", () => {
      state.dtao.holdGate = { isBlocked: true, message: "Root stake is on hold" }

      expect(render().current).toMatchObject({ isValid: false, error: "Root stake is on hold" })
    })
  })
})

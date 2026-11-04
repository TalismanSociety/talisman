import { appStore, type UnfinishedSwap } from "@core/domains/app/store.app"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TestWrapper } from "../../../../../tests/TestWrapper"

const EVM_ADDRESS = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A"
const HUB_TAO = "964:evm-native"
const BASE_WTAO = "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67"

const openSwapModal = vi.fn()
const featureFlags = { SWAPS_MULTI_HOP: true }
const held = { planck: 0n }

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@ui/components/Button", () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock("@ui/state/remoteConfig", () => ({
  useFeatureFlag: (flag: keyof typeof featureFlags) => featureFlags[flag],
}))

vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: () => ({ name: "Bridge account" }),
}))

vi.mock("@ui/state/chaindata", () => ({
  useToken: () => ({ symbol: "wTAO" }),
  useNetworkById: () => ({ name: "Bittensor EVM" }),
}))

vi.mock("@ui/hooks/useBalancesByParams", () => ({
  useBalancesByParams: () => {
    const rows = held.planck
      ? [
          {
            address: EVM_ADDRESS,
            tokenId: HUB_TAO,
            token: { symbol: "TAO" },
            transferable: { planck: held.planck, tokens: "1" },
          },
        ]
      : []
    return {
      balances: { find: (match: (row: unknown) => boolean) => ({ each: rows.filter(match) }) },
    }
  },
}))

vi.mock("../hooks/useSwapModal", () => ({
  useSwapModal: () => ({ open: openSwapModal }),
}))

import { UnfinishedSwapPrompt } from "../components/UnfinishedSwapPrompt"
import { quoteFromLegs } from "../swap-modules/helpers"
import { saveUnfinishedSwap } from "../unfinishedSwaps"

const UNFINISHED: UnfinishedSwap = {
  runId: "run-1",
  fromAddress: EVM_ADDRESS,
  fromTokenId: HUB_TAO,
  toTokenId: BASE_WTAO,
}

const renderPrompt = (formFromTokenId: string | null = null) =>
  render(<UnfinishedSwapPrompt formFromTokenId={formFromTokenId} />, { wrapper: TestWrapper })

const expectNoPrompt = async () => {
  await waitFor(() => expect(screen.queryByText("loading children")).toBeNull())
  expect(screen.queryByText("Finish your swap")).toBeNull()
}

describe("UnfinishedSwapPrompt", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    featureFlags.SWAPS_MULTI_HOP = true
    held.planck = 10n ** 18n
    await appStore.set({ unfinishedSwaps: [UNFINISHED] })
  })

  it("offers to finish a swap whose funds wait on the account", async () => {
    renderPrompt()

    expect(await screen.findByText("Finish your swap")).toBeTruthy()
  })

  it("stays hidden while the account holds none of the token", async () => {
    held.planck = 0n
    renderPrompt()

    await expectNoPrompt()
  })

  it("stays hidden when multi-hop swaps are off", async () => {
    featureFlags.SWAPS_MULTI_HOP = false
    renderPrompt()

    await expectNoPrompt()
  })

  it("stays hidden when the form already swaps from the held token", async () => {
    renderPrompt(HUB_TAO)

    await expectNoPrompt()
  })

  it("opens the swap modal on the held token, its target and its account", async () => {
    renderPrompt()

    fireEvent.click(await screen.findByText("Finish swap"))

    expect(openSwapModal).toHaveBeenCalledWith({
      entry: "finish_prompt",
      fromTokenId: HUB_TAO,
      toTokenId: BASE_WTAO,
      fromAddress: EVM_ADDRESS,
    })
  })

  it("forgets the swap when dismissed", async () => {
    renderPrompt()

    fireEvent.click(await screen.findByText("Dismiss"))

    await waitFor(() => expect(screen.queryByText("Finish your swap")).toBeNull())
    expect(await appStore.get("unfinishedSwaps")).toEqual([])
  })

  it("shows nothing once the run that saved the note sent its last leg", async () => {
    const quote = quoteFromLegs(
      [
        {
          protocol: "forevermoney",
          fromTokenId: HUB_TAO,
          toTokenId: BASE_WTAO,
          signer: EVM_ADDRESS,
          recipient: EVM_ADDRESS,
          inputAmount: 1n,
          outputAmount: 1n,
          fees: [],
          timeInSec: 180,
        },
      ],
      {
        protocol: "forevermoney",
        decentralisationScore: 2,
        providerLogo: "forevermoney.svg",
        providerName: "ForeverMoney",
      }
    )
    await saveUnfinishedSwap({
      id: UNFINISHED.runId,
      quote,
      slippage: 0.005,
      legs: [{ at: "sent", hash: "0x11", input: 1n }],
    })
    renderPrompt()

    await expectNoPrompt()
  })
})

import { fireEvent, render, screen } from "@testing-library/react"
import BigNumber from "bignumber.js"
import type { ComponentProps } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BittensorLegDetails } from "../components/BittensorLegDetails"
import type { DTaoLegData } from "../swap-modules/bittensor-dtao-swap-module"
import type { QuoteLeg } from "../swap-modules/common.swap-module"

const chooseStakeHotkey = vi.hoisted(() => vi.fn())

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("@ui/state/chaindata", () => ({
  useToken: (tokenId?: string) =>
    tokenId ? { id: tokenId, decimals: 9, subnetName: "Chutes", symbol: "ش" } : null,
}))
vi.mock("@ui/domains/Asset/TokensAndFiat", () => ({
  TokensAndFiat: ({ tokenId, planck }: { tokenId: string; planck: string | bigint }) => (
    <span>{`${planck} ${tokenId}`}</span>
  ),
}))
vi.mock("@ui/domains/Staking/Bittensor/components/SelectValidatorPill", () => ({
  SelectValidatorPill: ({
    hotkey,
    onSelect,
  }: {
    hotkey: string | null
    onSelect?: (hotkey: string) => void
  }) =>
    onSelect ? (
      <button type="button" onClick={() => onSelect("5Picked")}>{`pick, now ${hotkey}`}</button>
    ) : (
      <span>{`fixed ${hotkey}`}</span>
    ),
}))
vi.mock("@ui/domains/Staking/Bittensor/components/BittensorConfirmFields", () => ({
  BittensorConfirmAlphaPriceValue: ({ swapPrice }: { swapPrice: string }) => (
    <span>{`price ${swapPrice}`}</span>
  ),
  BittensorConfirmPriceImpactValue: ({ priceImpact }: { priceImpact?: number }) => (
    <span>{`impact ${priceImpact}`}</span>
  ),
  BittensorConfirmMevShieldLabel: () => <span>MEV Shield</span>,
  BittensorConfirmMevShieldValue: ({
    withMevShield,
    setIsMevProtectionEnabled,
  }: {
    withMevShield: boolean
    setIsMevProtectionEnabled: (enabled: boolean) => void
  }) => (
    <input
      type="checkbox"
      aria-label="MEV Shield"
      checked={withMevShield}
      onChange={(event) => setIsMevProtectionEnabled(event.target.checked)}
    />
  ),
  BittensorConfirmTalismanFeeLabel: () => <span>Talisman Fee</span>,
}))
vi.mock("@ui/domains/Staking/Bittensor/hooks/useMevShield", () => ({ useMevShield: vi.fn() }))
vi.mock("@ui/domains/Staking/Bittensor/hooks/useMevShieldFeeEstimate", () => ({
  useMevShieldFeeEstimate: vi.fn(),
}))
vi.mock("../hooks/useSwapModal", () => ({ useSwapModal: () => ({ close: vi.fn() }) }))
vi.mock("../SwapProvider", () => ({ useSwap: () => ({ chooseStakeHotkey }) }))

const TAO = "bittensor:substrate-native"
const SN64 = "bittensor:substrate-dtao:64"

const prices = { networkId: "bittensor", alphaPrice: "20000000", swapPrice: "20100000" }
const stake: DTaoLegData = {
  ...prices,
  netuid: 64,
  priceImpact: 0.5,
  direction: "stake",
  hotkey: "5Yuma",
  validator: "pickable",
}

const leg = (fromTokenId: string, toTokenId: string): QuoteLeg => ({
  protocol: "bittensor-dtao",
  fromTokenId,
  toTokenId,
  signer: "5Sender",
  recipient: "5Sender",
  inputAmount: 1_000_000_000n,
  outputAmount: 49_850_000_000n,
  fees: [],
  timeInSec: 12,
})

const setIsMevProtectionEnabled = vi.fn()
const shield = {
  withMevShield: false,
  isMevShieldDisabled: false,
  isMevShieldFeatureDisabled: false,
  setIsMevProtectionEnabled,
  txMode: "default" as const,
  feePlanck: 0n,
  isFeeLoading: false,
  feeError: null,
}

const renderDetails = (props: Partial<ComponentProps<typeof BittensorLegDetails>> = {}) =>
  render(
    <BittensorLegDetails
      leg={leg(TAO, SN64)}
      data={stake}
      fees={[{ name: "Talisman Fee", tokenId: TAO, amount: BigNumber("0.003") }]}
      feesLoading={false}
      provider={{ name: "Bittensor", logo: "logo.svg" }}
      shield={shield}
      canPickValidator
      feeRows={<span>network fee</span>}
      slippageRow={<span>slippage</span>}
      containerId="confirm"
      {...props}
    />
  )

beforeEach(() => vi.clearAllMocks())

describe("BittensorLegDetails", () => {
  it("shows the subnet, the estimated amount, the prices and both fees of a stake", () => {
    renderDetails()

    expect(screen.getByText("Bittensor")).toBeTruthy()
    expect(screen.getByText("SN64 | Chutes ش")).toBeTruthy()
    expect(screen.getByText(`49850000000 ${SN64}`)).toBeTruthy()
    expect(screen.getByText("price 20100000")).toBeTruthy()
    expect(screen.getByText("impact 0.5")).toBeTruthy()
    expect(screen.getByText("slippage")).toBeTruthy()
    expect(screen.getByText("network fee")).toBeTruthy()
    expect(screen.getByText(`3000000 ${TAO}`)).toBeTruthy()
  })

  it("lays a lone swap out as three cards without a provider row", () => {
    const { container } = renderDetails({ layout: "cards" })

    expect(screen.queryByText("Bittensor")).toBeNull()
    const cards = [...container.querySelectorAll("section")].map((card) => card.textContent)
    expect(cards).toHaveLength(3)
    expect(cards[0]).toContain("SN64 | Chutes ش")
    expect(cards[1]).toContain("slippage")
    expect(cards[2]).toContain("network fee")
  })

  it("lets the user pick the validator of a stake", () => {
    renderDetails()

    fireEvent.click(screen.getByText("pick, now 5Yuma"))

    expect(chooseStakeHotkey).toHaveBeenCalledWith("5Picked")
  })

  it("fixes the validator of a stake into a held position", () => {
    renderDetails({ data: { ...stake, hotkey: "5Held", validator: "pinned" } })

    expect(screen.getByText("fixed 5Held")).toBeTruthy()
  })

  it("fixes the validator of an unstake and names the subnet being sold", () => {
    renderDetails({
      leg: leg(`${SN64}:5Held`, TAO),
      data: { ...prices, netuid: 64, priceImpact: -0.5, direction: "unstake", hotkey: "5Held" },
    })

    expect(screen.getByText("fixed 5Held")).toBeTruthy()
    expect(screen.getByText("SN64 | Chutes ش")).toBeTruthy()
  })

  it("turns the MEV shield on from its toggle", () => {
    renderDetails()

    fireEvent.click(screen.getByLabelText("MEV Shield"))

    expect(setIsMevProtectionEnabled).toHaveBeenCalledWith(true)
  })

  it("lets the user pick the validator of a later leg, which has no shield until it is signed", () => {
    renderDetails({ shield: undefined })

    fireEvent.click(screen.getByText("pick, now 5Yuma"))

    expect(chooseStakeHotkey).toHaveBeenCalledWith("5Picked")
    expect(screen.queryByLabelText("MEV Shield")).toBeNull()
  })

  it("locks the validator and hides the shield once the swap started", () => {
    renderDetails({ shield: undefined, canPickValidator: false })

    expect(screen.getByText("fixed 5Yuma")).toBeTruthy()
    expect(screen.queryByLabelText("MEV Shield")).toBeNull()
  })

  it("shows root without a slippage tolerance or a Talisman fee", () => {
    renderDetails({ data: { ...stake, netuid: 0 }, fees: [] })

    expect(screen.queryByText("slippage")).toBeNull()
    expect(screen.queryByText("Talisman Fee")).toBeNull()
  })
})

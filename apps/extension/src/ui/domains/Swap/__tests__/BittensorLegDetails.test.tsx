import { fireEvent, render, screen } from "@testing-library/react"
import { type DTaoLeg, parseDTaoLeg } from "@ui/domains/Staking/Bittensor/utils/dTaoLeg"
import BigNumber from "bignumber.js"
import type { ComponentProps } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BittensorLegDetails } from "../components/BittensorLegDetails"
import type { QuoteLeg } from "../swap-modules/common.swap-module"

const chooseValidator = vi.hoisted(() => vi.fn())

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
vi.mock("../SwapProvider", () => ({ useSwap: () => ({ chooseValidator }) }))

const TAO = "bittensor:substrate-native"
const SN64 = "bittensor:substrate-dtao:64"

const SN64_YUMA = `${SN64}:5Yuma`
const ROOT_YUMA = "bittensor:substrate-dtao:0:5Yuma"

const leg = (fromTokenId: string, toTokenId: string, priceImpact = 0.5): QuoteLeg => ({
  protocol: "bittensor-dtao",
  fromTokenId,
  toTokenId,
  signer: "5Sender",
  recipient: "5Sender",
  inputAmount: 1_000_000_000n,
  outputAmount: 49_850_000_000n,
  fees: [],
  timeInSec: 12,
  priceImpact,
})

const read = (stakeLeg: QuoteLeg): DTaoLeg => {
  const dTao = parseDTaoLeg(stakeLeg.fromTokenId, stakeLeg.toTokenId)
  if (!dTao) throw new Error("expected a stake or an unstake")
  return dTao
}

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

type Props = Omit<ComponentProps<typeof BittensorLegDetails>, "dTao">

const renderDetails = ({ leg: shown = leg(TAO, SN64_YUMA), ...props }: Partial<Props> = {}) =>
  render(
    <BittensorLegDetails
      leg={shown}
      dTao={read(shown)}
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
    expect(screen.getByText(`49850000000 ${SN64_YUMA}`)).toBeTruthy()
    expect(screen.getByText("price 20060180")).toBeTruthy()
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

    expect(chooseValidator).toHaveBeenCalledWith("5Picked")
  })

  it("offers a validator to pick for a stake into a subnet with none chosen", () => {
    renderDetails({ leg: leg(TAO, SN64) })

    expect(screen.getByText("pick, now null")).toBeTruthy()
  })

  it("prices the alpha of an unstake by the TAO it returns", () => {
    renderDetails({
      leg: {
        ...leg(`${SN64}:5Held`, TAO),
        inputAmount: 50_000_000_000n,
        outputAmount: 997_000_000n,
      },
    })

    expect(screen.getByText("price 19940000")).toBeTruthy()
  })

  it("fixes the validator of an unstake and names the subnet being sold", () => {
    renderDetails({ leg: leg(`${SN64}:5Held`, TAO, -0.5) })

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

    expect(chooseValidator).toHaveBeenCalledWith("5Picked")
    expect(screen.queryByLabelText("MEV Shield")).toBeNull()
  })

  it("locks the validator and hides the shield once the swap started", () => {
    renderDetails({ shield: undefined, canPickValidator: false })

    expect(screen.getByText("fixed 5Yuma")).toBeTruthy()
    expect(screen.queryByLabelText("MEV Shield")).toBeNull()
  })

  it("shows root without a slippage tolerance or a Talisman fee", () => {
    renderDetails({ leg: leg(TAO, ROOT_YUMA), fees: [] })

    expect(screen.queryByText("slippage")).toBeNull()
    expect(screen.queryByText("Talisman Fee")).toBeNull()
  })
})

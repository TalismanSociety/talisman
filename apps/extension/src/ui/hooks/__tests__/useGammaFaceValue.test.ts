import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const TAO_RATES = { usd: { price: 250 }, aud: { price: 375 } }

const mockTokenRates = vi.fn()
vi.mock("@ui/state/tokenRates", () => ({
  useTokenRates: (tokenId: string) => mockTokenRates(tokenId),
}))

const mockCurrency = vi.fn()
vi.mock("@ui/state/settings", () => ({ useSelectedCurrency: () => mockCurrency() }))

import { useGammaFaceValue } from "@ui/hooks/useGammaFaceValue"

describe("useGammaFaceValue", () => {
  it("converts credits to AUD at 1 USD each through the TAO cross rate", () => {
    mockTokenRates.mockImplementation((tokenId) =>
      tokenId === "bittensor:substrate-native" ? TAO_RATES : null
    )
    mockCurrency.mockReturnValue("aud")

    const { result } = renderHook(() => useGammaFaceValue("0.15477037"))

    expect(result.current).toEqual({ kind: "gamma-face-value", amount: 0.232155555 })
  })

  it("is unknown when TAO has no rate in the selected currency", () => {
    mockTokenRates.mockReturnValue(TAO_RATES)
    mockCurrency.mockReturnValue("eur")

    const { result } = renderHook(() => useGammaFaceValue("0.15477037"))

    expect(result.current).toBeNull()
  })
})

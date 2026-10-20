import { fireEvent, render, screen } from "@testing-library/react"
import type { TokenPick } from "@ui/domains/Asset/TokenPicker"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const DOT_ID = "polkadot:substrate-native"

const track = vi.hoisted(() => vi.fn())
const onPickerTokenChanged = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("@ui/components/ModalDialog", () => ({
  ModalDialog: ({ children }: { children: ReactNode }) => children,
}))
vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => ({
    [DOT_ID]: { id: DOT_ID, networkId: "polkadot", symbol: "DOT", __isKnown: true },
  }),
  useNetworksMapById: () => ({ polkadot: { id: "polkadot", __isKnown: true } }),
}))
vi.mock("../useYieldxyzEnterModal", () => ({ useYieldxyzEnterModal: () => ({ close: vi.fn() }) }))
vi.mock("../useYieldxyzEnterWizard", () => ({
  useYieldxyzEnterWizard: () => ({ pickerTokenIds: [DOT_ID], onPickerTokenChanged }),
}))
vi.mock("@ui/domains/Asset/TokenPicker", () => ({
  TokenPicker: ({ onSelect }: { onSelect: (tokenId: string, pick: TokenPick) => void }) => (
    <button
      type="button"
      onClick={() => onSelect(DOT_ID, { searched: false, networkFiltered: false, position: 3 })}
    >
      DOT
    </button>
  ),
}))

import { YieldxyzEnterStepToken } from "./YieldxyzEnterStepToken"

describe("YieldxyzEnterStepToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("tracks the pick and moves on to the products of the token", () => {
    render(<YieldxyzEnterStepToken />)

    fireEvent.click(screen.getByText("DOT"))

    expect(track).toHaveBeenCalledExactlyOnceWith("earn_token_selected", {
      searched: false,
      position: 3,
      token_id: DOT_ID,
      symbol: "DOT",
      network_id: "polkadot",
    })
    expect(onPickerTokenChanged).toHaveBeenCalledExactlyOnceWith(DOT_ID)
  })
})

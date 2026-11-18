import type { Balances } from "@talismn/balances"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDTaoStakeValidator } from "../hooks/useDTaoStakeValidator"

const { registerDTaoPosition, notify, wallet } = vi.hoisted(() => ({
  registerDTaoPosition: vi.fn(),
  notify: vi.fn(),
  wallet: {
    balances: { each: [] as unknown[] },
    isInitialising: false,
    remote: {
      bittensor: {
        featuredValidators: ["5Yuma"] as string[],
        defaultValidatorsBySubnet: {} as Record<string, string>,
      },
    },
  },
}))

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("@ui/api", () => ({ api: { registerDTaoPosition } }))
vi.mock("@ui/components/Notifications", () => ({ notify }))
vi.mock("@ui/state/balances", () => ({
  useBalances: () => wallet.balances as unknown as Balances,
  useIsBalanceInitializing: () => wallet.isInitialising,
}))
vi.mock("@ui/state/remoteConfig", () => ({ useRemoteConfig: () => wallet.remote }))

const TAO = "bittensor:substrate-native"
const SN64 = "bittensor:substrate-dtao:64"
const SN64_YUMA = `${SN64}:5Yuma`
const SN64_PICKED = `${SN64}:5Picked`
const ACCOUNT = "5Staker"

type Props = Parameters<typeof useDTaoStakeValidator>[0]

const setToTokenId = vi.fn()
const props = (changes: Partial<Props> = {}): Props => ({
  toTokenId: SN64,
  address: ACCOUNT,
  toAssetIds: [SN64],
  setToTokenId,
  ...changes,
})
/** the form: it holds the destination, which the hook replaces through `setToTokenId` */
const render = (initial?: Partial<Props>) =>
  renderHook(
    (current: Props) => {
      const [toTokenId, setDestination] = useState(current.toTokenId)
      const [given, setGiven] = useState(current.toTokenId)
      if (given !== current.toTokenId) {
        setGiven(current.toTokenId)
        setDestination(current.toTokenId)
      }
      return useDTaoStakeValidator({
        ...current,
        toTokenId,
        setToTokenId: (tokenId) => {
          setToTokenId(tokenId)
          setDestination(tokenId)
        },
      })
    },
    { initialProps: props(initial) }
  )

const position = (hotkey: string, free: bigint, address = ACCOUNT) => ({
  token: { type: "substrate-dtao", networkId: "bittensor", netuid: 64, hotkey },
  address,
  free: { planck: free },
})

beforeEach(() => {
  vi.clearAllMocks()
  wallet.balances = { each: [] }
  wallet.isInitialising = false
  wallet.remote.bittensor.featuredValidators = ["5Yuma"]
  registerDTaoPosition.mockImplementation(
    async ({ netuid, hotkey }) => `bittensor:substrate-dtao:${netuid}:${hotkey}`
  )
})
afterEach(() => vi.useRealTimers())

describe("useDTaoStakeValidator", () => {
  it("replaces a subnet's own token with the default validator's position, once the swap lists it", async () => {
    const { result, rerender } = render()

    await waitFor(() =>
      expect(registerDTaoPosition).toHaveBeenCalledWith({
        networkId: "bittensor",
        netuid: 64,
        hotkey: "5Yuma",
      })
    )
    expect(result.current.isChoosingValidator).toBe(true)
    expect(setToTokenId).not.toHaveBeenCalled()

    rerender(props({ toAssetIds: [SN64, SN64_YUMA] }))

    expect(setToTokenId).toHaveBeenCalledWith(SN64_YUMA)
    expect(result.current.isChoosingValidator).toBe(false)
  })

  it("is choosing from the first moment, while the wallet still registers the position", () => {
    registerDTaoPosition.mockReturnValue(new Promise(() => {}))
    const { result } = render()

    expect(result.current.isChoosingValidator).toBe(true)
  })

  it("chooses the default again for a subnet selected a second time", async () => {
    const { rerender } = render()
    await waitFor(() => expect(registerDTaoPosition).toHaveBeenCalledTimes(1))
    rerender(props({ toTokenId: SN64_YUMA, toAssetIds: [SN64, SN64_YUMA] }))

    rerender(props({ toTokenId: SN64, toAssetIds: [SN64, SN64_YUMA] }))

    await waitFor(() => expect(setToTokenId).toHaveBeenCalledWith(SN64_YUMA))
    expect(registerDTaoPosition).toHaveBeenCalledTimes(2)
  })

  it("defaults to the account's largest stake on the subnet, once the balances are in", async () => {
    wallet.isInitialising = true
    const { rerender } = render()
    await act(async () => {})
    expect(registerDTaoPosition).not.toHaveBeenCalled()

    wallet.isInitialising = false
    wallet.balances = {
      each: [position("5Small", 10n), position("5Large", 500n), position("5Other", 900n, "5Else")],
    }
    rerender(props())

    await waitFor(() =>
      expect(registerDTaoPosition).toHaveBeenCalledWith(
        expect.objectContaining({ hotkey: "5Large" })
      )
    )
  })

  it("leaves a destination that already names a validator, or is no subnet", async () => {
    render({ toTokenId: SN64_PICKED, toAssetIds: [SN64, SN64_PICKED] })
    render({ toTokenId: TAO, toAssetIds: [TAO] })
    render({ toTokenId: null })

    await act(async () => {})
    expect(registerDTaoPosition).not.toHaveBeenCalled()
  })

  it("waits for an account, and for a source the swap can stake from", async () => {
    render({ address: null })
    render({ toAssetIds: [TAO] })
    render({ toAssetIds: undefined })

    await act(async () => {})
    expect(registerDTaoPosition).not.toHaveBeenCalled()
  })

  it("chooses nothing where no validator is featured", async () => {
    wallet.remote.bittensor.featuredValidators = []
    const { result } = render()

    await act(async () => {})
    expect(registerDTaoPosition).not.toHaveBeenCalled()
    expect(result.current.isChoosingValidator).toBe(false)
  })

  it("selects the position of a validator the user picks", async () => {
    const { result, rerender } = render({ toTokenId: SN64_YUMA, toAssetIds: [SN64, SN64_YUMA] })

    await act(() => result.current.chooseValidator("5Picked"))
    expect(result.current.isChoosingValidator).toBe(true)

    rerender(props({ toTokenId: SN64_YUMA, toAssetIds: [SN64, SN64_YUMA, SN64_PICKED] }))

    expect(setToTokenId).toHaveBeenCalledWith(SN64_PICKED)
  })

  it("drops a choice when the destination changed before the swap listed the position", async () => {
    const { result, rerender } = render({ toTokenId: SN64_YUMA, toAssetIds: [SN64, SN64_YUMA] })
    await act(() => result.current.chooseValidator("5Picked"))

    rerender(props({ toTokenId: TAO, toAssetIds: [SN64_PICKED] }))

    expect(setToTokenId).not.toHaveBeenCalled()
    expect(result.current.isChoosingValidator).toBe(false)
  })

  it("tells the user when a validator they picked could not be selected", async () => {
    const cause = new Error("unknown subnet")
    registerDTaoPosition.mockRejectedValue(cause)
    const { result } = render({ toTokenId: SN64_YUMA, toAssetIds: [SN64, SN64_YUMA] })

    await act(() => result.current.chooseValidator("5Picked"))

    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: "error", cause }))
    expect(result.current.isChoosingValidator).toBe(false)
  })

  it("asks once for a default it could not register, without a toast", async () => {
    registerDTaoPosition.mockRejectedValue(new Error("unknown subnet"))
    const { rerender, result } = render()
    await waitFor(() => expect(result.current.isChoosingValidator).toBe(false))

    rerender(props({ toAssetIds: [SN64, TAO] }))
    await act(async () => {})

    expect(registerDTaoPosition).toHaveBeenCalledTimes(1)
    expect(notify).not.toHaveBeenCalled()
  })

  it("gives up a choice the swap never lists, and does not hold the form for it", async () => {
    vi.useFakeTimers()
    const { result } = render()
    await act(async () => {})
    expect(result.current.isChoosingValidator).toBe(true)

    await act(async () => vi.advanceTimersByTime(20_000))

    expect(result.current.isChoosingValidator).toBe(false)
    expect(setToTokenId).not.toHaveBeenCalled()
    expect(registerDTaoPosition).toHaveBeenCalledTimes(1)
  })
})

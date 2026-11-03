import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ButtonHTMLAttributes } from "react"
import { describe, expect, it, vi } from "vitest"

const FROM = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"

const ethSignAndSend = vi.hoisted(() => vi.fn())
vi.mock("@ui/api", () => ({ api: { ethSignAndSend } }))
vi.mock("@ui/components/Notifications", () => ({ notify: vi.fn() }))
vi.mock("@ui/hooks/useReportPayloadLock", () => ({ useReportPayloadLock: () => vi.fn() }))
vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: () => ({ type: "keypair", address: FROM }),
}))
vi.mock("@core/domains/keyring/exports", () => ({ isAccountPlatformEthereum: () => true }))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }))
vi.mock("../SignApproveButton", () => ({
  SignApproveButton: ({ processing, primary: _, ...props }: Record<string, unknown>) => (
    <button
      type="button"
      disabled={!!processing}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    />
  ),
}))
vi.mock("../SignLedgerEthereum", () => ({ SignLedgerEthereum: () => null }))

import { TxSubmitButtonEth } from "./TxSubmitButtonEth"

const SwapScreen = ({
  readNonce,
  onError,
}: {
  readNonce: () => Promise<number>
  onError: () => void
}) => {
  const { data: nonce } = useQuery({
    queryKey: ["useNonce", FROM, "8453", undefined],
    queryFn: readNonce,
  })
  if (nonce === undefined) return null
  return (
    <TxSubmitButtonEth
      tx={{
        platform: "ethereum",
        networkId: "8453",
        payload: { from: FROM, to: FROM, value: 1n, nonce, gas: 21000n, type: "eip1559" },
      }}
      containerId="test"
      label="Confirm Swap"
      onSubmit={vi.fn()}
      onError={onError}
    />
  )
}

describe("TxSubmitButtonEth", () => {
  it("lets the user retry a failed transaction only once the nonce is read afresh", async () => {
    let chainNonce = 6
    let releaseRead = () => {}
    const readNonce = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          releaseRead = () => resolve(chainNonce)
          if (readNonce.mock.calls.length === 1) releaseRead()
        })
    )
    ethSignAndSend.mockRejectedValueOnce(new Error("nonce too low: tx: 6 state: 7"))
    ethSignAndSend.mockResolvedValueOnce("0xhash")
    const onError = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SwapScreen readNonce={readNonce} onError={onError} />
      </QueryClientProvider>
    )

    fireEvent.click(await screen.findByText("Confirm Swap"))
    await waitFor(() => expect(readNonce).toHaveBeenCalledTimes(2))
    expect(screen.getByText("Confirm Swap")).toHaveProperty("disabled", true)
    expect(onError).not.toHaveBeenCalled()

    chainNonce = 7
    releaseRead()
    await waitFor(() => expect(screen.getByText("Confirm Swap")).toHaveProperty("disabled", false))
    expect(onError).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText("Confirm Swap"))

    await waitFor(() => expect(ethSignAndSend).toHaveBeenCalledTimes(2))
    expect(ethSignAndSend.mock.calls.map(([, tx]) => tx.nonce)).toEqual([6, 7])
  })
})

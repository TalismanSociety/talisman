import { describe, expect, it, vi } from "vitest"

import {
  ETH_ERROR_EIP1193_USER_REJECTED,
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  ETH_ERROR_EIP1474_INVALID_PARAMS,
  type EthProviderRpcError,
  WrappedEthProviderRpcError,
} from "../EthProviderRpcError"
import { getInjectableEvmProvider } from "../getInjectableEvmProvider"

const getProvider = (requestError: unknown) => {
  const sendRequest = vi.fn((type: string, args?: unknown) => {
    if (type === "pub(eth.subscribe)") return Promise.resolve(true)
    const { method } = args as { method: string }
    if (method === "eth_chainId") return Promise.resolve("0x1")
    if (method === "eth_accounts") return Promise.resolve([])
    return Promise.reject(requestError)
  })
  // biome-ignore lint/suspicious/noExplicitAny: SendRequest's overloads don't matter to the provider logic under test
  return getInjectableEvmProvider(sendRequest as any)
}

const requestError = async (raisedByWallet: unknown) => {
  const provider = getProvider(raisedByWallet)
  return provider
    .request({ method: "eth_signTypedData_v4", params: [] })
    .then(() => {
      throw new Error("expected request to reject")
    })
    .catch((err: EthProviderRpcError) => err)
}

describe("getInjectableEvmProvider request errors", () => {
  it("passes wallet errors with EIP-1193 codes through unchanged", async () => {
    const raised = new WrappedEthProviderRpcError(
      "User Rejected Request",
      ETH_ERROR_EIP1193_USER_REJECTED
    )

    const err = await requestError(raised)

    expect(err).toBe(raised)
  })

  it("relays code and message of EIP-1474 errors", async () => {
    const err = await requestError(
      new WrappedEthProviderRpcError("Wrong network", ETH_ERROR_EIP1474_INVALID_PARAMS)
    )

    expect(err.code).toBe(ETH_ERROR_EIP1474_INVALID_PARAMS)
    expect(err.message).toBe("Wrong network")
  })

  it("relays the rpc data of EIP-1474 errors as data", async () => {
    const err = await requestError(
      new WrappedEthProviderRpcError("execution reverted", -32000, "0xdeadbeef")
    )

    expect(err.code).toBe(-32000)
    expect(err.data).toBe("0xdeadbeef")
  })

  it("flattens internal errors, whose message may not be meant for the dapp", async () => {
    const err = await requestError(
      new WrappedEthProviderRpcError("Port has been disconnected", ETH_ERROR_EIP1474_INTERNAL_ERROR)
    )

    expect(err.code).toBe(ETH_ERROR_EIP1474_INTERNAL_ERROR)
    expect(err.message).toBe("Internal JSON-RPC error.")
  })

  it("flattens untyped errors", async () => {
    const err = await requestError(new Error("boom"))

    expect(err.code).toBe(ETH_ERROR_EIP1474_INTERNAL_ERROR)
    expect(err.message).toBe("Internal JSON-RPC error.")
  })

  it("maps a closed popup to a user rejection", async () => {
    const err = await requestError(new Error("Cancelled"))

    expect(err.code).toBe(ETH_ERROR_EIP1193_USER_REJECTED)
    expect(err.message).toBe("User Rejected Request")
  })
})

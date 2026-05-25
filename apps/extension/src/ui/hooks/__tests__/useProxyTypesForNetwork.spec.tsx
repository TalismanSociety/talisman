import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  accountProxiesUpdatePalletCache: vi.fn(),
  getMetadataRpcFromDef: vi.fn(),
  getProxyTypes: vi.fn(),
  subChainMetadata: vi.fn(),
  useDotNetwork: vi.fn(),
}))

vi.mock("@core/domains/accountProxies/getProxyTypes", () => ({
  getProxyTypes: mocks.getProxyTypes,
}))

vi.mock("@core/domains/metadata/helpers", () => ({
  getMetadataRpcFromDef: mocks.getMetadataRpcFromDef,
}))

vi.mock("@ui/api", () => ({
  api: {
    accountProxiesUpdatePalletCache: mocks.accountProxiesUpdatePalletCache,
    subChainMetadata: mocks.subChainMetadata,
  },
}))

vi.mock("@ui/state/chaindata", () => ({
  useDotNetwork: mocks.useDotNetwork,
}))

import { useProxyTypesForNetwork } from "../useProxyTypesForNetwork"

const wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe("useProxyTypesForNetwork", () => {
  beforeEach(() => {
    mocks.accountProxiesUpdatePalletCache.mockReset()
    mocks.accountProxiesUpdatePalletCache.mockResolvedValue(true)
    mocks.getMetadataRpcFromDef.mockReset()
    mocks.getProxyTypes.mockReset()
    mocks.subChainMetadata.mockReset()
    mocks.useDotNetwork.mockReturnValue({
      id: "polkadot",
      genesisHash: "0xgenesis",
      specVersion: 1,
    })
  })

  it("does not cache pallet absence when metadata is unavailable", async () => {
    mocks.subChainMetadata.mockResolvedValue(undefined)

    const { result } = renderHook(() => useProxyTypesForNetwork("polkadot"), { wrapper })

    await waitFor(() => expect(result.current.isFetched).toBe(true))

    expect(mocks.accountProxiesUpdatePalletCache).not.toHaveBeenCalled()
  })

  it("does not cache pallet absence when metadata loading fails", async () => {
    mocks.subChainMetadata.mockRejectedValue(new Error("metadata unavailable"))

    const { result } = renderHook(() => useProxyTypesForNetwork("polkadot"), { wrapper })

    await waitFor(() => expect(result.current.isFetched).toBe(true))

    expect(mocks.accountProxiesUpdatePalletCache).not.toHaveBeenCalled()
  })

  it("caches pallet presence when proxy types are found", async () => {
    mocks.subChainMetadata.mockResolvedValue({ type: "metadata-def" })
    mocks.getMetadataRpcFromDef.mockReturnValue("0xmetadata")
    mocks.getProxyTypes.mockReturnValue([{ name: "Any", docs: [] }])

    renderHook(() => useProxyTypesForNetwork("polkadot"), { wrapper })

    await waitFor(() =>
      expect(mocks.accountProxiesUpdatePalletCache).toHaveBeenCalledWith({
        networkId: "polkadot",
        specVersion: 1,
        hasProxyPallet: true,
      })
    )
  })
})

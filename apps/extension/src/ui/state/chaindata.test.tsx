import { Subscribe } from "@react-rxjs/core"
import type { Network, Token } from "@talismn/chaindata-provider"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { BehaviorSubject, Observable } from "rxjs"
import { describe, expect, it, vi } from "vitest"

import { useNetworksMapById, useTokens } from "./chaindata"

const subscriptions = vi.hoisted(() => ({ live: 0 }))

vi.mock("@react-rxjs/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-rxjs/core")>()
  const countSubscriptions = (source: Observable<unknown>) =>
    new Observable((subscriber) => {
      subscriptions.live++
      const subscription = source.subscribe(subscriber)
      return () => {
        subscriptions.live--
        subscription.unsubscribe()
      }
    })
  return {
    ...actual,
    bind: (source: unknown, ...defaultValue: []) =>
      typeof source === "function"
        ? actual.bind((...args: unknown[]) => countSubscriptions(source(...args)), ...defaultValue)
        : actual.bind(source as Observable<unknown>, ...defaultValue),
  }
})

const NETWORKS = [
  { id: "polkadot", platform: "polkadot", isDefault: true },
  { id: "1", platform: "ethereum", isDefault: true },
] as Network[]

const TOKENS = [
  { id: "polkadot:substrate-native", networkId: "polkadot", platform: "polkadot", isDefault: true },
] as Token[]

vi.mock("@ui/api", () => ({
  api: {
    networks: (callback: (networks: Network[]) => void) => {
      callback(NETWORKS)
      return () => {}
    },
    tokens: (callback: (tokens: Token[]) => void) => {
      callback(TOKENS)
      return () => {}
    },
  },
}))

vi.mock("@core/domains/chaindata/store.activeNetworks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/domains/chaindata/store.activeNetworks")>()),
  activeNetworksStore: { observable: new BehaviorSubject({}) },
}))

vi.mock("@core/domains/chaindata/store.activeTokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/domains/chaindata/store.activeTokens")>()),
  activeTokensStore: { observable: new BehaviorSubject({}) },
}))

const wrapper = ({ children }: { children: ReactNode }) => <Subscribe>{children}</Subscribe>

describe("chaindata query hooks", () => {
  it("keep one subscription when re-rendered with an inline options object", () => {
    const { result, rerender } = renderHook(() => useNetworksMapById({ platform: "polkadot" }), {
      wrapper,
    })
    const subscriptionsAfterFirstRender = subscriptions.live

    for (let i = 0; i < 10; i++) rerender()

    expect(Object.keys(result.current)).toEqual(["polkadot"])
    expect(subscriptions.live).toBe(subscriptionsAfterFirstRender)
  })

  it("share one subscription between equivalent options", () => {
    renderHook(() => useTokens({ platform: "polkadot", activeOnly: true }), { wrapper })
    const subscriptionsAfterFirstRender = subscriptions.live

    const { result } = renderHook(
      () => useTokens({ activeOnly: true, includeTestnets: true, platform: "polkadot" }),
      { wrapper }
    )

    expect(result.current.map((token) => token.id)).toEqual(["polkadot:substrate-native"])
    expect(subscriptions.live).toBe(subscriptionsAfterFirstRender)
  })
})

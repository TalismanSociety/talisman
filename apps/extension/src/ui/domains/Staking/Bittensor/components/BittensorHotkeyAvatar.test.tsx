import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BittensorHotkeyAvatar } from "./BittensorHotkeyAvatar"

const HOTKEY = "5DywxdtESjskgPZrDXL86qV44SpPgJuqs9X6noyJJwX9PaSD"
const UNKNOWN_HOTKEY = "5C4jtv7VBZ1WfDbsJD9zwj3w83D7Ltoi7tJ7YhS3AhTLsn57"

vi.mock("@ui/domains/Account/AccountIcon", () => ({
  AccountIcon: () => <span data-testid="account-icon" />,
}))

vi.mock("@ui/hooks/queryStoragePersister", () => ({
  createQueryStoragePersister: () => undefined,
  PERSIST_AGE_ONE_YEAR: 0,
}))

vi.mock("@ui/hooks/imageCache", () => ({
  invalidateCachedImage: vi.fn(),
  useImageSwr: () => null,
}))

const fetchMock = vi.fn(async () => ({
  ok: true,
  json: async () => ({ [HOTKEY]: "coldkey.webp" }),
}))
vi.stubGlobal("fetch", fetchMock)

const renderAvatar = (hotkey: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <BittensorHotkeyAvatar hotkey={hotkey} />
    </QueryClientProvider>
  )
}

afterEach(() => {
  fetchMock.mockClear()
})

describe("BittensorHotkeyAvatar", () => {
  it("renders the chaindata logo for a hotkey listed in logos.json", async () => {
    const { container } = renderAvatar(HOTKEY)

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull())

    expect(container.querySelector("img")?.getAttribute("src")).toMatch(
      /\/assets\/bittensor\/hotkeys\/coldkey\.webp$/
    )
    expect(container.querySelector("[data-testid=account-icon]")).toBeNull()
  })

  it("renders the account icon for a hotkey without logo", async () => {
    const { container } = renderAvatar(UNKNOWN_HOTKEY)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    expect(container.querySelector("[data-testid=account-icon]")).not.toBeNull()
    expect(container.querySelector("img")).toBeNull()
  })

  it("falls back to the account icon once every image source failed", async () => {
    const { container } = renderAvatar(HOTKEY)

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull())
    const firstSrc = container.querySelector("img")?.getAttribute("src")

    fireEvent.error(container.querySelector("img")!)
    await waitFor(() =>
      expect(container.querySelector("img")?.getAttribute("src")).not.toBe(firstSrc)
    )

    fireEvent.error(container.querySelector("img")!)
    await waitFor(() => expect(container.querySelector("img")).toBeNull())

    expect(container.querySelector("[data-testid=account-icon]")).not.toBeNull()
  })
})

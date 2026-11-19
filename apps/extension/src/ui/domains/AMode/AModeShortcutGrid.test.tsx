import { act, fireEvent, render, screen, within } from "@testing-library/react"
import type { FC } from "react"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  stored: [] as string[],
  setFavourites: vi.fn(),
}))

vi.mock("@ui/state/settings", () => ({
  useSetting: () => {
    const [value, setValue] = useState(mocks.stored)
    const set = (next: string[] | ((prev: string[]) => string[])) => {
      const resolved = typeof next === "function" ? next(value) : next
      mocks.setFavourites(resolved)
      setValue(resolved)
    }
    return [value, set] as const
  },
}))

import { AModeShortcutGrid } from "./AModeShortcutGrid"
import type { AModeShortcutGroup } from "./types"
import { useAModeFavourites } from "./useAModeFavourites"

const Icon: FC = () => null
const shortcut = (id: string, label: string) => ({ id, label, icon: Icon, onClick: vi.fn() })

const GROUPS: AModeShortcutGroup[] = [
  {
    id: "trade",
    title: "Trade",
    shortcuts: [shortcut("activity", "Activity"), shortcut("earn", "Earn positions")],
  },
  {
    id: "accounts",
    title: "Accounts",
    shortcuts: [
      shortcut("import-pk", "Import private key"),
      shortcut("import-json", "Import JSON"),
    ],
  },
  { id: "help", title: "Help", shortcuts: [shortcut("docs", "Docs")] },
]

const Grid: FC<{ collapsed?: boolean }> = ({ collapsed }) => {
  const favourites = useAModeFavourites(GROUPS)
  return (
    <AModeShortcutGrid
      groups={GROUPS}
      favourites={favourites}
      compact={!!collapsed}
      collapsedGroupCount={collapsed ? 1 : undefined}
    />
  )
}

const tileIds = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-testid^='a-mode-shortcut-']")].map((el) =>
    el.getAttribute("data-testid")?.replace("a-mode-shortcut-", "")
  )

const search = async (text: string) => {
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText("Search features"), { target: { value: text } })
  })
}

describe("AModeShortcutGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.stored = []
  })

  it("filters shortcuts from every group by label, including collapsed ones", async () => {
    render(<Grid collapsed />)
    expect(screen.queryByTestId("a-mode-shortcut-import-pk")).toBeNull()

    await search("import")

    expect(tileIds(screen.getByTestId("a-mode-search-results"))).toEqual([
      "import-pk",
      "import-json",
    ])
  })

  it("shows an empty state when nothing matches", async () => {
    render(<Grid />)
    await search("zzz")

    expect(screen.getByTestId("a-mode-search-empty")).toBeTruthy()
    expect(screen.queryByTestId("a-mode-search-results")).toBeNull()
  })

  it("pins a shortcut to Favourites and stores it, and unpins it again", async () => {
    render(<Grid />)
    const favourites = () => screen.getByTestId("a-mode-group-favourites")
    expect(tileIds(favourites())).toEqual([])

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Docs to favourites" }))
    })
    expect(mocks.setFavourites).toHaveBeenLastCalledWith(["docs"])
    expect(tileIds(favourites())).toEqual(["docs"])

    await act(async () => {
      fireEvent.click(
        within(favourites()).getByRole("button", { name: "Remove Docs from favourites" })
      )
    })
    expect(mocks.setFavourites).toHaveBeenLastCalledWith([])
    expect(tileIds(favourites())).toEqual([])
  })

  it("ignores stored favourites that are no longer shortcuts", () => {
    mocks.stored = ["gone", "earn"]
    render(<Grid />)

    expect(tileIds(screen.getByTestId("a-mode-group-favourites"))).toEqual(["earn"])
  })
})

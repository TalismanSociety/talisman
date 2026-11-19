import { SearchInput } from "@ui/components/SearchInput"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { AModeButton } from "./AModeButton"
import type { AModeShortcut, AModeShortcutGroup } from "./types"
import type { AModeFavourites } from "./useAModeFavourites"

const searchShortcuts = (groups: AModeShortcutGroup[], search: string): AModeShortcut[] => {
  const query = search.trim().toLocaleLowerCase()
  const seen = new Set<string>()
  return groups
    .flatMap((group) => group.shortcuts)
    .filter((s) => {
      if (seen.has(s.id) || !s.label.toLocaleLowerCase().includes(query)) return false
      seen.add(s.id)
      return true
    })
}

const Tiles: FC<{
  shortcuts: AModeShortcut[]
  compact: boolean
  favourites: AModeFavourites
}> = ({ shortcuts, compact, favourites }) => (
  <div className={cn("grid gap-1", compact ? "grid-cols-4" : "grid-cols-8")}>
    {shortcuts.map((shortcut) => (
      <AModeButton
        key={shortcut.id}
        shortcut={shortcut}
        variant={compact ? "compact" : "regular"}
        favourite={{
          pinned: favourites.isFavourite(shortcut.id),
          onToggle: () => favourites.toggle(shortcut.id),
        }}
      />
    ))}
  </div>
)

const GroupSection: FC<{
  group: AModeShortcutGroup
  compact: boolean
  favourites: AModeFavourites
  empty?: string
}> = ({ group, compact, favourites, empty }) => (
  <section
    aria-labelledby={`a-mode-group-${group.id}`}
    data-testid={`a-mode-group-${group.id}`}
    className={cn(
      compact
        ? "flex flex-col gap-2"
        : "grid grid-cols-[8rem_1fr] items-center gap-4 border-grey-800 border-b py-2 last:border-b-0"
    )}
  >
    <h3
      id={`a-mode-group-${group.id}`}
      className={cn("font-bold text-body-secondary", compact ? "text-tiny" : "text-xs")}
    >
      {group.title}
    </h3>
    {group.shortcuts.length ? (
      <Tiles shortcuts={group.shortcuts} compact={compact} favourites={favourites} />
    ) : (
      <p className="py-4 text-body-disabled text-xs">{empty}</p>
    )}
  </section>
)

export const AModeShortcutGrid: FC<{
  groups: AModeShortcutGroup[]
  favourites: AModeFavourites
  compact: boolean
  /** registry groups shown before More, all of them when unset */
  collapsedGroupCount?: number
  /** shown with the hidden groups when expanded */
  more?: ReactNode
}> = ({ groups, favourites, compact, collapsedGroupCount, more }) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState("")

  const results = useMemo(
    () => (search.trim() ? searchShortcuts(groups, search) : null),
    [groups, search]
  )

  const collapsible = collapsedGroupCount !== undefined
  const visibleGroups = collapsible && !expanded ? groups.slice(0, collapsedGroupCount) : groups
  const sectionClassName = cn(
    "flex flex-col",
    compact ? "gap-6" : "rounded-sm bg-grey-900 px-6 py-2"
  )
  const favouritesEmpty = t("Press the star on any shortcut to pin it here")

  return (
    <div className="flex flex-col gap-4" data-testid="a-mode-grid">
      <SearchInput
        containerClassName={cn(
          "h-16 w-full rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
          "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
        )}
        placeholder={t("Search features")}
        onChange={setSearch}
      />
      {results ? (
        <section aria-label={t("Search results")} className={sectionClassName}>
          {results.length ? (
            <div className={compact ? undefined : "py-2"} data-testid="a-mode-search-results">
              <Tiles shortcuts={results} compact={compact} favourites={favourites} />
            </div>
          ) : (
            <p
              data-testid="a-mode-search-empty"
              className="py-8 text-center text-body-disabled text-xs"
            >
              {t("No features match “{{search}}”", { search: search.trim() })}
            </p>
          )}
        </section>
      ) : (
        <>
          <div className={sectionClassName}>
            <GroupSection
              group={favourites.group}
              compact={compact}
              favourites={favourites}
              empty={favouritesEmpty}
            />
            {visibleGroups.map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                compact={compact}
                favourites={favourites}
              />
            ))}
          </div>
          {collapsible && expanded && more}
          {collapsible && groups.length > (collapsedGroupCount ?? 0) && (
            <button
              type="button"
              data-testid="a-mode-toggle-more"
              aria-expanded={expanded}
              onClick={() => setExpanded((prev) => !prev)}
              className="h-20 rounded-sm bg-grey-900 text-body-secondary text-xs hover:bg-white/10 hover:text-body focus-visible:outline-2 focus-visible:outline-primary"
            >
              {expanded ? t("Less") : t("More")}
            </button>
          )}
        </>
      )}
    </div>
  )
}

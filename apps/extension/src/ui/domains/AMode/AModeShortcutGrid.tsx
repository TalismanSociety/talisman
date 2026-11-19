import { cn } from "@ui/util/cn"
import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"

import { AModeButton } from "./AModeButton"
import type { AModeShortcutGroup } from "./types"

const POPUP_VISIBLE_GROUPS = 2

export const AModeShortcutGrid: FC<{ groups: AModeShortcutGroup[]; compact: boolean }> = ({
  groups,
  compact,
}) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const visibleGroups = compact && !expanded ? groups.slice(0, POPUP_VISIBLE_GROUPS) : groups

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex flex-col", compact ? "gap-4" : "rounded-sm bg-grey-900 px-6 py-2")}>
        {visibleGroups.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`a-mode-group-${group.id}`}
            className={cn(
              compact
                ? "flex flex-col gap-2"
                : "grid grid-cols-[7rem_1fr] items-center gap-4 border-grey-800 border-b py-2 last:border-b-0"
            )}
          >
            <h3
              id={`a-mode-group-${group.id}`}
              className={cn("font-bold text-body-secondary", compact ? "text-tiny" : "text-xs")}
            >
              {group.title}
            </h3>
            <div className={cn("grid gap-1", compact ? "grid-cols-4" : "grid-cols-6")}>
              {group.shortcuts.map((shortcut) => (
                <AModeButton
                  key={shortcut.id}
                  shortcut={shortcut}
                  variant={compact ? "compact" : "regular"}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {compact && groups.length > POPUP_VISIBLE_GROUPS && (
        <button
          type="button"
          data-testid="a-mode-toggle-more"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="h-20 rounded-sm text-body-secondary text-xs hover:bg-white/10 hover:text-body focus-visible:outline-2 focus-visible:outline-primary"
        >
          {expanded ? t("Less") : t("More")}
        </button>
      )}
    </div>
  )
}

import { isNotNil } from "@talismn/util"
import { useSetting } from "@ui/state/settings"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { AModeShortcutGroup } from "./types"

export type AModeFavourites = {
  /** pinned shortcuts in pin order, ids that are not in `groups` are skipped */
  group: AModeShortcutGroup
  isFavourite: (id: string) => boolean
  toggle: (id: string) => void
}

export const useAModeFavourites = (groups: AModeShortcutGroup[]): AModeFavourites => {
  const { t } = useTranslation()
  const [ids, setIds] = useSetting("aModeFavourites")

  const group = useMemo(() => {
    const byId = new Map(groups.flatMap((g) => g.shortcuts).map((s) => [s.id, s]))
    return {
      id: "favourites",
      title: t("Favourites"),
      shortcuts: ids.map((id) => byId.get(id)).filter(isNotNil),
    }
  }, [groups, ids, t])

  const isFavourite = useCallback((id: string) => ids.includes(id), [ids])

  const toggle = useCallback(
    (id: string) =>
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds]
  )

  return { group, isFavourite, toggle }
}

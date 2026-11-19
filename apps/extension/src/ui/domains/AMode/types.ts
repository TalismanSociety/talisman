import type { FC, SVGProps } from "react"

export type AModeShortcut = {
  /** stable, used for the `a-mode-shortcut-${id}` test id and the stored favourites */
  id: string
  label: string
  icon: FC<SVGProps<SVGSVGElement>>
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  /** red dot, for a real state only */
  badge?: boolean
}

export type AModeShortcutGroup = {
  id: string
  title: string
  shortcuts: AModeShortcut[]
}

export type AModeShortcuts = {
  primary: AModeShortcut[]
  groups: AModeShortcutGroup[]
  /** every shortcut above, by id */
  byId: Readonly<Record<string, AModeShortcut>>
}

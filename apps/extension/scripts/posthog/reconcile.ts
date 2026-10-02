import type { Tile } from "./dashboards"

export const MANAGED_TAG = "aiec-managed"

export const isManaged = (obj: { tags?: readonly string[] | null }) =>
  (obj.tags ?? []).includes(MANAGED_TAG)

export const withTags = (
  stored: readonly string[] | null | undefined,
  required: readonly string[] = [MANAGED_TAG]
) => [...new Set([...(stored ?? []), ...required])]

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])])
    )
  return value
}

export const stableJson = (value: unknown) => JSON.stringify(sortKeys(value))

export const isSame = (a: unknown, b: unknown) => stableJson(a) === stableJson(b)

export const changedFields = <T extends Record<string, unknown>>(
  current: { readonly [K in keyof T]?: unknown },
  want: T
): Partial<T> =>
  Object.fromEntries(
    Object.entries(want).filter(([key, value]) => !isSame(current[key as keyof T], value))
  ) as Partial<T>

export const jsonDiff = (stored: unknown, spec: unknown, limit = 12): string[] => {
  const lines: string[] = []
  const show = (value: unknown) => (value === undefined ? "(absent)" : JSON.stringify(value))
  const visit = (a: unknown, b: unknown, path: string) => {
    if (lines.length >= limit) return
    const bothObjects =
      a &&
      b &&
      typeof a === "object" &&
      typeof b === "object" &&
      Array.isArray(a) === Array.isArray(b)
    if (!bothObjects) {
      if (!isSame(a, b)) lines.push(`${path || "(root)"}: ${show(a)} → ${show(b)}`)
      return
    }
    const left = a as Record<string, unknown>
    const right = b as Record<string, unknown>
    const keys = Array.isArray(a)
      ? [...Array(Math.max(a.length, (b as unknown[]).length)).keys()].map(String)
      : [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
    for (const key of keys)
      visit(
        left[key],
        right[key],
        Array.isArray(a) ? `${path}[${key}]` : path ? `${path}.${key}` : key
      )
  }
  visit(stored, spec, "")
  return lines
}

/** PostHog stamps `source.version` on every saved query; the spec leaves it to PostHog. */
export const withoutSchemaVersion = (query: unknown) => {
  const source = (query as { source?: Record<string, unknown> } | undefined)?.source
  if (!source || !("version" in source)) return query
  const { version: _version, ...rest } = source
  return { ...(query as object), source: rest }
}

export const pickByName = <T extends { name: string }>(
  candidates: readonly T[],
  name: string
): T | undefined => candidates.find((c) => c.name === name) ?? candidates[0]

const GRID = { cols: 12, half: 6, third: 4, numberH: 3, chartH: 5, tableH: 6, funnelH: 6 }

export const computeLayouts = (tiles: readonly Tile[]) => {
  let x = 0
  let y = 0
  let rowH = 0
  return tiles.map((tile, index) => {
    const kind = tile.query.source.kind
    const display = (tile.query.source.trendsFilter as { display?: string } | undefined)?.display
    const h =
      display === "BoldNumber"
        ? GRID.numberH
        : ["FunnelsQuery", "RetentionQuery", "PathsQuery"].includes(kind)
          ? GRID.funnelH
          : kind === "HogQLQuery"
            ? GRID.tableH
            : GRID.chartH
    const w = tile.size === "full" ? GRID.cols : tile.size === "third" ? GRID.third : GRID.half
    if (x + w > GRID.cols) {
      x = 0
      y += rowH
      rowH = 0
    }
    const layout = {
      sm: { x, y, w, h },
      xs: { x: 0, y: index * GRID.chartH, w: 1, h },
    }
    x += w
    rowH = Math.max(rowH, h)
    return layout
  })
}

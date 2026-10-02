/**
 * What a matched pattern may still be waiting for. `descendant`: it ends in a prefix splat
 * (`portfolio/*`), so a descendant `<Routes>` names the screen once it renders. `redirect`: it
 * ends in a bare catch-all (`*`), which either is the screen or redirects within a frame.
 */
export type PatternAwaits = "nothing" | "redirect" | "descendant"

export type JoinedPattern = { pattern: string; awaits: PatternAwaits }

const awaitsAfter = (last: string | undefined): PatternAwaits => {
  if (last === "*") return "redirect"
  return last?.endsWith("*") ? "descendant" : "nothing"
}

export const joinRoutePattern = (paths: readonly (string | undefined)[]): JoinedPattern => {
  const segments = paths
    .flatMap((path) => (path ?? "").split("/"))
    .filter((segment) => segment !== "" && segment !== "*")
  return { pattern: `/${segments.join("/")}`, awaits: awaitsAfter(paths.at(-1)) }
}

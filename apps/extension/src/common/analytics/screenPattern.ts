/** Capitals stay legal for `auth-sol-signIn`. */
const ROUTE_WORD = /^[a-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*$/
const ROUTE_WORD_MAX_LENGTH = 30

export const isRouteWord = (segment: string): boolean =>
  segment.length <= ROUTE_WORD_MAX_LENGTH && ROUTE_WORD.test(segment)

const isRouteSegment = (segment: string) =>
  segment === "*" || /^:[A-Za-z][A-Za-z0-9]*$/.test(segment) || isRouteWord(segment)

export const isRoutePattern = (pattern: string): boolean =>
  pattern === "/" ||
  (pattern.startsWith("/") &&
    pattern.length <= 128 &&
    pattern.slice(1).split("/").every(isRouteSegment))

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

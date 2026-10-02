import { joinRoutePattern } from "@common/analytics/screenPattern"
import { useScreenRegistration } from "@ui/hooks/analytics/screens"
import { type ReactNode, useContext, useMemo } from "react"
import {
  createRoutesFromChildren,
  matchRoutes,
  Routes as RouterRoutes,
  UNSAFE_RouteContext,
  useLocation,
} from "react-router-dom"

/** The part of the pathname a descendant `<Routes>` matches, as react-router computes it. */
const remainingPathname = (pathname: string, parentPathnameBase: string) => {
  if (parentPathnameBase === "/") return pathname
  const parentSegments = parentPathnameBase.replace(/^\//, "").split("/")
  const segments = pathname.replace(/^\//, "").split("/")
  return `/${segments.slice(parentSegments.length).join("/")}`
}

/**
 * react-router's `<Routes>`, which also names the screen it renders after its route pattern.
 * A descendant `<Routes>` inherits the matches of its ancestors through route context, so the
 * pattern is the router's own, from the outermost route to the deepest.
 * `screen={false}`: a `<Routes>` that renders chrome, not the screen.
 */
export const Routes = ({ children, screen = true }: { children?: ReactNode; screen?: boolean }) => {
  const { matches: parentMatches } = useContext(UNSAFE_RouteContext)
  const { pathname } = useLocation()

  const joined = useMemo(() => {
    if (!screen) return null
    const parentPathnameBase = parentMatches.at(-1)?.pathnameBase ?? "/"
    const own = matchRoutes(createRoutesFromChildren(children), {
      pathname: remainingPathname(pathname, parentPathnameBase),
    })
    const paths = [...parentMatches, ...(own ?? [])].map((match) => match.route.path)
    // nothing below matched: this is the deepest the screen gets
    return own
      ? joinRoutePattern(paths)
      : { ...joinRoutePattern(paths), awaits: "nothing" as const }
  }, [screen, children, pathname, parentMatches])

  useScreenRegistration(joined, parentMatches.length)

  return <RouterRoutes>{children}</RouterRoutes>
}

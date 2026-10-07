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

const remainingPathname = (pathname: string, parentPathnameBase: string) => {
  if (parentPathnameBase === "/") return pathname
  const parentSegments = parentPathnameBase.replace(/^\//, "").split("/")
  const segments = pathname.replace(/^\//, "").split("/")
  return `/${segments.slice(parentSegments.length).join("/")}`
}

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
    return own
      ? joinRoutePattern(paths)
      : { ...joinRoutePattern(paths), awaits: "nothing" as const }
  }, [screen, children, pathname, parentMatches])

  useScreenRegistration(joined, parentMatches.length)

  return <RouterRoutes>{children}</RouterRoutes>
}

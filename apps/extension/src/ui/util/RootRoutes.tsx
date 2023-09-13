import { useContext, useMemo } from "react"
import { UNSAFE_RouteContext as RouteContext } from "react-router"
import { Routes, RoutesProps } from "react-router-dom"

/**
 * React router doesn't support absolute `path` URLs inside nested `<Route>` components.
 *
 * This component is a workaround for the issue.
 *
 * It can be used in place of a `<Routes>` component when you want its children `<Route>` components
 * to ignore any `<Route>` components which are parents of the `<Routes>` component.
 *
 * More info can be found in this discussion:
 * https://github.com/remix-run/react-router/discussions/9841#discussioncomment-4637486
 */
export const RootRoutes = <T extends RoutesProps>(props: T) => {
  const context = useContext(RouteContext)
  const value = useMemo(() => ({ ...context, matches: [] }), [context])

  return (
    <RouteContext.Provider value={value}>
      <Routes {...props} />
    </RouteContext.Provider>
  )
}

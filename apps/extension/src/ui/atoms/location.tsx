import { useEffect } from "react"
import { Location, useLocation, useSearchParams } from "react-router-dom"
import { atom, selector, useSetRecoilState } from "recoil"

const routeState = atom<{ searchParams: URLSearchParams; location: Location }>({
  key: "routeState",
  default: {
    searchParams: new URLSearchParams(),
    location: {
      hash: "",
      key: "initializing",
      pathname: "/",
      search: "",
      state: null,
    },
  },
})

export const searchParamsState = selector({
  key: "searchParamsState",
  get: ({ get }) => {
    const { searchParams } = get(routeState)
    return searchParams
  },
})

export const locationState = selector({
  key: "locationState",
  get: ({ get }) => {
    const { location } = get(routeState)
    return location
  },
})

// syncs recoil atoms to react-router-dom's location, which is only accessible via hooks
// this allows us to use recoil selectors to access the location and searchParams
export const LocationSync = () => {
  const setRouteState = useSetRecoilState(routeState)

  const [searchParams] = useSearchParams()
  const location = useLocation()

  useEffect(() => {
    setRouteState({ searchParams, location })
  }, [searchParams, location, setRouteState])

  return null
}

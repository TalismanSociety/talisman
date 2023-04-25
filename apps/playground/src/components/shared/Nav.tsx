import { classNames } from "@talismn/util"
import { Link, useLocation } from "react-router-dom"

export const Nav = () => {
  const location = useLocation()

  return (
    <div className="flex w-full gap-6">
      <Link
        to="/substrate"
        className={classNames(location.pathname.startsWith("/substrate") && "text-primary-500")}
      >
        Substrate
      </Link>
      <Link
        to="/ethereum"
        className={classNames(location.pathname.startsWith("/ethereum") && "text-primary-500")}
      >
        Ethereum
      </Link>
      <Link
        to="/ui"
        className={classNames(location.pathname.startsWith("/ui") && "text-primary-500")}
      >
        UI
      </Link>
    </div>
  )
}

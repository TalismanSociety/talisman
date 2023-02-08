import { classNames } from "@talismn/util"
import { Link, useLocation } from "react-router-dom"

export const Nav = () => {
  const location = useLocation()

  return (
    <div className="flex w-full gap-6">
      <Link
        to="/substrate"
        className={classNames(location.pathname === "/substrate" && "text-primary-500")}
      >
        Substrate
      </Link>
      <Link
        to="/ethereum"
        className={classNames(location.pathname === "/ethereum" && "text-primary-500")}
      >
        Ethereum
      </Link>
      <Link
        to="/button"
        className={classNames(location.pathname === "/button" && "text-primary-500")}
      >
        Button
      </Link>
      <Link
        to="/checkbox"
        className={classNames(location.pathname === "/checkbox" && "text-primary-500")}
      >
        Checkbox
      </Link>
      <Link
        to="/mystical-background"
        className={classNames(location.pathname === "/mystical-background" && "text-primary-500")}
      >
        Mystical Background
      </Link>
      <Link
        to="/tx-status"
        className={classNames(location.pathname === "/tx-status" && "text-primary-500")}
      >
        TxStatus
      </Link>
    </div>
  )
}

import { classNames } from "@talismn/util"
import { Link, useLocation } from "react-router-dom"

export const NavSubstrate = () => {
  const location = useLocation()

  return (
    <div className="flex w-full gap-6">
      <Link
        to="/substrate/balances"
        className={classNames(location.pathname === "/substrate/balances" && "text-primary-500")}
      >
        Balances
      </Link>
      <Link
        to="/substrate/identity"
        className={classNames(location.pathname === "/substrate/identity" && "text-primary-500")}
      >
        Identity
      </Link>
      <Link
        to="/substrate/sign"
        className={classNames(location.pathname === "/substrate/sign" && "text-primary-500")}
      >
        Sign
      </Link>
      <Link
        to="/substrate/encryption"
        className={classNames(location.pathname === "/substrate/encryption" && "text-primary-500")}
      >
        Encryption
      </Link>
      <Link
        to="/substrate/misc"
        className={classNames(location.pathname === "/substrate/misc" && "text-primary-500")}
      >
        Misc
      </Link>
    </div>
  )
}

import { Link, useLocation } from "react-router-dom"
import { classNames } from "talisman-ui"

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
    </div>
  )
}

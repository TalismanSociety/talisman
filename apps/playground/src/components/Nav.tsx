import { Link, useLocation } from "react-router-dom"
import { classNames } from "talisman-ui"

export const Nav = () => {
  const location = useLocation()

  return (
    <div className="flex w-full gap-6">
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

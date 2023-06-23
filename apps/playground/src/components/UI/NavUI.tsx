import { classNames } from "@talismn/util"
import { Link, useLocation } from "react-router-dom"

export const NavUI = () => {
  const location = useLocation()

  return (
    <div className="flex w-full gap-6">
      <Link
        to="/ui/button"
        className={classNames(location.pathname === "/ui/button" && "text-primary-500")}
      >
        Button
      </Link>
      <Link
        to="/ui/checkbox"
        className={classNames(location.pathname === "/ui/checkbox" && "text-primary-500")}
      >
        Checkbox
      </Link>
      <Link
        to="/ui/toggle"
        className={classNames(location.pathname === "/ui/toggle" && "text-primary-500")}
      >
        Toggle
      </Link>
      <Link
        to="/ui/mystical-background"
        className={classNames(
          location.pathname === "/ui/mystical-background" && "text-primary-500"
        )}
      >
        Mystical Background
      </Link>
      <Link
        to="/ui/tx-status"
        className={classNames(location.pathname === "/ui/tx-status" && "text-primary-500")}
      >
        TxStatus
      </Link>
      <Link
        to="/ui/drawer"
        className={classNames(location.pathname === "/ui/drawer" && "text-primary-500")}
      >
        Drawer
      </Link>
      <Link
        to="/ui/modal"
        className={classNames(location.pathname === "/ui/modal" && "text-primary-500")}
      >
        Modal
      </Link>
    </div>
  )
}

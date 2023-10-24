import { classNames } from "@talismn/util"
import { Link, useLocation } from "react-router-dom"

export const NavEthereum = () => {
  const location = useLocation()

  return (
    <div className="flex w-full gap-6">
      <Link
        to="/ethereum/transaction"
        className={classNames(location.pathname === "/ethereum/transaction" && "text-primary-500")}
      >
        Transfer
      </Link>
      <Link
        to="/ethereum/contract"
        className={classNames(location.pathname === "/ethereum/contract" && "text-primary-500")}
      >
        Contract
      </Link>
      <Link
        to="/ethereum/erc20"
        className={classNames(location.pathname === "/ethereum/erc20" && "text-primary-500")}
      >
        ERC20
      </Link>
      <Link
        to="/ethereum/erc721"
        className={classNames(location.pathname === "/ethereum/erc721" && "text-primary-500")}
      >
        ERC721
      </Link>
      <Link
        to="/ethereum/sign"
        className={classNames(location.pathname === "/ethereum/sign" && "text-primary-500")}
      >
        Sign
      </Link>
    </div>
  )
}

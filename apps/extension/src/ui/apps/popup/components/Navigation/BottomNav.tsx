import { classNames } from "@talisman/util/classNames"
import { api } from "@ui/api"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { ButtonHTMLAttributes, DetailedHTMLProps, FC, useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useNavigationContext } from "../../context/NavigationContext"
import { NavIconExpand, NavIconHome, NavIconMore, NavIconNft } from "./icons"

type BottomNavButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  current?: boolean
}

const BottomNavButton: FC<BottomNavButtonProps> = ({ current, className, children, ...props }) => (
  <button
    {...props}
    className={classNames(
      " text-body-secondary hover:bg-grey-800 hover:text-body flex h-20 w-20 justify-center rounded-sm text-center",
      "allow-focus focus-visible:border-body active:text-body",
      current && "text-body",
      className
    )}
  >
    {children}
  </button>
)

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { account } = useSelectedAccount()
  const { open } = useNavigationContext()

  const handleHomeClick = useCallback(() => {
    navigate("/portfolio")
  }, [navigate])

  const handleNftClick = useCallback(() => {
    //genericEvent("open web app nfts", { from: "popup nav" })
    window.open("https://app.talisman.xyz/nfts")
  }, [])

  const handleExpandClick = useCallback(() => {
    // assume paths are the same in dashboard
    // portfolio pages expect an account argument to stay in sync with popup
    const qs = `?account=${account?.address ?? "all"}`
    api.dashboardOpen(`${location.pathname}${qs}`)
  }, [account, location.pathname])

  return (
    <div className="border-t-grey-800 flex h-32 min-h-[6.4rem] justify-between border-t px-12 text-3xl">
      <BottomNavButton onClick={handleHomeClick} current={location.pathname === "/portfolio"}>
        <NavIconHome />
      </BottomNavButton>
      <BottomNavButton onClick={handleNftClick}>
        <NavIconNft />
      </BottomNavButton>
      <BottomNavButton onClick={handleExpandClick}>
        <NavIconExpand />
      </BottomNavButton>
      <BottomNavButton onClick={open}>
        <NavIconMore />
      </BottomNavButton>
    </div>
  )
}

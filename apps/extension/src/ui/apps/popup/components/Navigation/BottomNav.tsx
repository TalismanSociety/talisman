import { HomeIcon, IconMore, ImageIcon, MaximizeIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { api } from "@ui/api"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { ButtonHTMLAttributes, DetailedHTMLProps, FC, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import { useLocation, useNavigate } from "react-router-dom"
import { useNavigationContext } from "../../context/NavigationContext"

type BottomNavButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  current?: boolean
}

const BottomNavButton: FC<BottomNavButtonProps> = ({ current, className, children, ...props }) => (
  <button
    {...props}
    disabled={props.disabled ?? current}
    className={classNames(
      " text-body-secondary hover:bg-grey-800 hover:text-body flex h-20 w-20 justify-center rounded-sm text-center",
      current && "text-body cursor-default hover:bg-transparent",
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
    <div className="border-t-grey-800  flex h-32 min-h-[6.4rem] justify-between border-t px-12">
      <BottomNavButton onClick={handleHomeClick} current={location.pathname === "/portfolio"}>
        <HomeIcon />
      </BottomNavButton>
      <BottomNavButton onClick={handleNftClick}>
        <ImageIcon />
      </BottomNavButton>
      <BottomNavButton onClick={handleExpandClick}>
        <MaximizeIcon />
      </BottomNavButton>
      <BottomNavButton onClick={open}>
        <IconMore />
      </BottomNavButton>
    </div>
  )
}

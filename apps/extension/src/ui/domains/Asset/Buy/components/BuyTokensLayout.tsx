import { ChevronLeftIcon } from "@talismn/icons"
import { FC, ReactNode } from "react"
import { IconButton } from "talisman-ui"

import { useBuyTokensWizard } from "../useBuyTokensWizard"
import { BuyTokensOptionSwitch } from "./form/BuyTokensOptionSwitch"

type BuyTokensLayoutProps = {
  title?: ReactNode
  withBackLink?: boolean
  children?: ReactNode
}

export const BuyTokensLayout: FC<BuyTokensLayoutProps> = ({ title, children, withBackLink }) => {
  const { close, route, setRoute } = useBuyTokensWizard()
  const handleClick = () => {
    route === "mainForm" ? close() : setRoute("mainForm")
  }

  return (
    <div id="buy-tokens-modal" className="relative flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-10">
        <div className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center">
          {withBackLink && (
            <IconButton onClick={handleClick}>
              <ChevronLeftIcon />
            </IconButton>
          )}
          <div className="flex items-center justify-between">
            <div className="font-bold text-white">{title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {route === "mainForm" && <BuyTokensOptionSwitch />}
        </div>
      </div>
      <div className="w-full grow overflow-hidden">{children}</div>
    </div>
  )
}

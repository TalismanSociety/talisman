import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { FC, ReactNode, useCallback } from "react"
import { IconButton } from "talisman-ui"

import { useBuyTokensWizard } from "../useBuyTokensWizard"
import { BuyTokensOptionSwitch } from "./form/BuyTokensOptionSwitch"

type BuyTokensLayoutProps = {
  title?: ReactNode
  withBackLink?: boolean
  children?: ReactNode
}

export const BuyTokensLayout: FC<BuyTokensLayoutProps> = ({ title, children, withBackLink }) => {
  const { close, route } = useBuyTokensWizard()
  const handleBackClick = useCallback(() => {}, [])

  return (
    <div id="main" className="relative flex h-full w-full flex-col px-10">
      <div className="flex items-center justify-between">
        <div className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center">
          {withBackLink && (
            <IconButton onClick={handleBackClick}>
              <ChevronLeftIcon />
            </IconButton>
          )}
          <div className="flex items-center justify-between">
            <div className="font-bold capitalize text-white">{title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {route === "mainForm" && <BuyTokensOptionSwitch />}
          <IconButton onClick={close}>
            <XIcon />
          </IconButton>
        </div>
      </div>
      <div className="w-full grow overflow-hidden">{children}</div>
    </div>
  )
}

import { FadeIn } from "@talisman/components/FadeIn"
import { classNames } from "@talismn/util"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import { FC, ReactNode } from "react"
import { createPortal } from "react-dom"

type EthSignContainerProps = {
  title: ReactNode
  children: ReactNode
  className?: string
  alert?: ReactNode
}

export const EthSignContainer: FC<EthSignContainerProps> = ({
  title,
  children,
  className,
  alert,
}) => {
  return (
    <FadeIn className={classNames("flex h-full flex-col", className)}>
      <h1 className="!leading-base !mt-0 font-sans !text-lg !font-bold">{title}</h1>
      <div className="flex w-full flex-col items-center gap-4 p-8">{children}</div>
      <div className="mt-12 mb-8 grow text-center">
        <ViewDetailsEth />
      </div>
      {alert && createPortal(alert, document.getElementById("sign-alerts-inject") as Element)}
    </FadeIn>
  )
}

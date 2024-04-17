import { FadeIn } from "@talisman/components/FadeIn"
import { classNames } from "@talismn/util"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import { ViewDetailsSub } from "@ui/domains/Sign/ViewDetails/ViewDetailsSub"
import { FC, ReactNode } from "react"
import { createPortal } from "react-dom"

import { RisksAnalysisTxButton } from "./Ethereum/risk-analysis/RIskAnalysisPillButton"

type SignContainerProps = {
  title: ReactNode
  children: ReactNode
  className?: string
  alert?: ReactNode
  header?: ReactNode
  networkType: "ethereum" | "substrate"
}

export const SignContainer: FC<SignContainerProps> = ({
  title,
  children,
  className,
  alert,
  header,
  networkType,
}) => {
  const alertContainer = document.getElementById("sign-alerts-inject") as Element

  return (
    <FadeIn className={classNames("flex h-full flex-col pt-8", className)}>
      {header}
      <h1 className="leading-base text-body mb-12 mt-0 font-sans text-lg font-bold">{title}</h1>
      <div className="flex w-full flex-col items-center gap-4 py-8 [&>div]:max-w-full [&>div]:overflow-x-hidden">
        {children}
      </div>
      <div className="mb-8 mt-12 grow text-center">
        {networkType === "ethereum" && (
          <div className="grid w-full grid-cols-2 items-center justify-center gap-4">
            <div className="text-right">
              <ViewDetailsEth />
            </div>
            <div className="text-left">
              <RisksAnalysisTxButton />
            </div>
          </div>
        )}
        {networkType === "substrate" && <ViewDetailsSub />}
      </div>
      {alert && alertContainer && createPortal(alert, alertContainer)}
    </FadeIn>
  )
}

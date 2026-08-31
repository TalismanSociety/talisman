import { FadeIn } from "@ui/components/FadeIn"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import { ViewDetailsSub } from "@ui/domains/Sign/ViewDetails/ViewDetailsSub"
import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"
import { createPortal } from "react-dom"

import { SubSignDecoded } from "./Substrate/decode/SubSignDecoded"

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
    <FadeIn className={cn("flex h-full flex-col pt-8", className)}>
      {header}
      <h1 className="mt-0 mb-12 font-bold font-sans text-body text-lg leading-base">{title}</h1>
      <div className="flex w-full flex-col items-center gap-4 py-8 [&>div]:max-w-full [&>div]:overflow-x-hidden">
        {children}
      </div>
      <div className="flex w-full justify-center">
        {networkType === "ethereum" && <ViewDetailsEth />}
        {networkType === "substrate" && <ViewDetailsSub />}
      </div>
      <div className="mt-12 mb-8 grow text-center">
        {networkType === "substrate" && <SubSignDecoded />}
      </div>
      {alert && alertContainer && createPortal(alert, alertContainer)}
    </FadeIn>
  )
}

import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import { FC, ReactNode } from "react"
import { classNames } from "talisman-ui"

type EthSignContainerProps = {
  title: ReactNode
  children: ReactNode
  className?: string
  bottom?: ReactNode
}

export const EthSignContainer: FC<EthSignContainerProps> = ({
  title,
  children,
  className,
  bottom,
}) => {
  return (
    <div className={classNames("flex h-full flex-col", className)}>
      <h1 className="!leading-base !mt-0 font-sans !text-lg !font-bold">{title}</h1>
      <div className="flex w-full flex-col gap-4 p-8">{children}</div>
      <div className="my-16 grow text-center">
        <ViewDetailsEth />
      </div>
      {bottom}
    </div>
  )
}

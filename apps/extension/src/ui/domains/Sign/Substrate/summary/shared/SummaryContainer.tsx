import { classNames } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

export const SummaryContainer: FC<PropsWithChildren & { className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div
      className={classNames(
        //"border-grey-700 leading-paragraph text-body rounded-sm border p-4",
        "text-body leading-paragraph border-grey-700 bg-grey-800 mb-8 mt-4 rounded-sm p-4 text-center",
        "bg-primary/5 border-primary/20 border",
        className,
      )}
    >
      {children}
    </div>
  )
}

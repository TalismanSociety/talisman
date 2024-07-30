import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, Fragment, ReactNode } from "react"

type BreadcrumbItem = {
  label: ReactNode
  className?: string
  onClick?: () => void
}

export const Breadcrumb: FC<{
  items: BreadcrumbItem[]
  className?: string
}> = ({ items, className }) => {
  return (
    <div className={classNames("text-body-secondary flex items-center gap-1 text-base", className)}>
      {items.map(({ label, onClick, className }, index) => {
        return (
          <Fragment key={index}>
            {onClick ? (
              <button
                onClick={onClick}
                className={classNames(
                  "bg-grey-900 hover:bg-grey-800 hover:text-grey-300 h-[3.2rem] truncate rounded-sm px-4",
                  className
                )}
              >
                {label}
              </button>
            ) : (
              <span className={classNames("truncate", className)}>{label}</span>
            )}
            {index < items.length - 1 && <ChevronRightIcon />}
          </Fragment>
        )
      })}
    </div>
  )
}

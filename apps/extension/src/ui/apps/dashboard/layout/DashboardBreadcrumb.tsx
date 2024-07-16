import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, Fragment, ReactNode } from "react"

type BreadcrumbItem = {
  label: ReactNode
  onClick?: () => void
}

export const DashboardBreadcrumb: FC<{
  items: BreadcrumbItem[]
  className?: string
}> = ({ items, className }) => {
  return (
    <div className={classNames("text-body-secondary flex items-center gap-1 text-base", className)}>
      {items.map((item, index) => {
        return (
          <Fragment key={index}>
            {item.onClick ? (
              <button onClick={item.onClick} className="hover:text-grey-300 truncate underline">
                {item.label}
              </button>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
            {index < items.length - 1 && <ChevronRightIcon />}
          </Fragment>
        )
      })}
    </div>
  )
}

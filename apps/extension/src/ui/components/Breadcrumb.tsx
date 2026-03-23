import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@ui/util/cn"

import { type FC, Fragment, type ReactNode } from "react"

export type BreadcrumbItem = {
  label: ReactNode
  className?: string
  onClick?: () => void
}

export const Breadcrumb: FC<{
  items: BreadcrumbItem[]
  className?: string
}> = ({ items, className }) => {
  return (
    <div className={classNames("flex items-center gap-1 text-base text-body-secondary", className)}>
      {items.map(({ label, onClick, className }, index) => {
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <Fragment key={index}>
            {onClick ? (
              <button
                type="button"
                onClick={onClick}
                className={classNames(
                  "h-16 truncate rounded-sm bg-grey-900 px-4 hover:bg-grey-800 hover:text-grey-300",
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

import { ChevronRightIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

export const AModeMiniPanel: FC<{
  testId: string
  title: string
  /** heading suffix, such as a count */
  meta?: ReactNode
  action?: { label: string; onClick: () => void }
  empty?: string
  children?: ReactNode
}> = ({ testId, title, meta, action, empty, children }) => (
  <section
    data-testid={testId}
    aria-label={title}
    className="flex min-w-0 flex-col gap-3 rounded-sm bg-grey-900 p-6"
  >
    <header className="flex h-10 items-center justify-between gap-4">
      <h3 className="flex items-baseline gap-2 font-bold text-body text-xs">
        {title}
        {meta && <span className="font-normal text-body-secondary text-tiny">{meta}</span>}
      </h3>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-1 rounded-xs text-body-secondary text-tiny hover:text-body focus-visible:outline-2 focus-visible:outline-primary"
        >
          {action.label}
          <ChevronRightIcon className="size-6" aria-hidden />
        </button>
      )}
    </header>
    {empty ? (
      <p className="flex min-h-36 flex-1 items-center justify-center rounded-xs bg-grey-850 px-4 text-center text-body-disabled text-xs">
        {empty}
      </p>
    ) : (
      <ul className="flex flex-col">{children}</ul>
    )}
  </section>
)

export const AModeMiniPanelRow: FC<{
  testId?: string
  onClick: () => void
  className?: string
  children: ReactNode
}> = ({ testId, onClick, className, children }) => (
  <li>
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex h-16 w-full min-w-0 items-center gap-4 rounded-xs px-2 text-left text-xs hover:bg-white/5",
        "focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2",
        className
      )}
    >
      {children}
    </button>
  </li>
)

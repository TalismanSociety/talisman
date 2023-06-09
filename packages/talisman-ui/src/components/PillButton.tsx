import { classNames } from "@talismn/util"
import { FC, SVGProps, forwardRef } from "react"

export type PillButtonSize = "tiny" | "xs" | "sm" | "base"

export type PillButtonProps = Omit<
  React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    icon?: FC<SVGProps<SVGSVGElement>>
    size?: PillButtonSize
  },
  "ref"
>

const getFontSize = (size: PillButtonSize) => {
  // because of tailwind, all used classes must appear as plain text
  switch (size) {
    case "base":
      return "text-base"
    case "tiny":
      return "text-tiny"
    case "sm":
      return "text-sm"
    case "xs":
    default:
      return "text-xs"
  }
}

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ icon: Icon, size = "xs", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={classNames(
          getFontSize(size),
          "transition-colors duration-100 ease-out",
          "bg-grey-800 text-body-secondary inline-flex shrink-0 items-center justify-center leading-none outline-none",
          "gap-3 rounded-[1em] px-[1em] py-[0.666em]",
          "hover:bg-grey-700 disabled:bg-grey-800 disabled:opacity-50",
          "allow-focus outline-offset-0 focus-visible:outline-current",
          className
        )}
        {...props}
      >
        {Icon && (
          <div>
            <Icon />
          </div>
        )}
        <div className="max-w-full">{children}</div>
      </button>
    )
  }
)
PillButton.displayName = "PillButton"

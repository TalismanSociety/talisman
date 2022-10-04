import { FC, SVGProps } from "react"
import { classNames } from "../utils"

export type PillButtonSize = "tiny" | "xs" | "sm"

export type PillButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  icon?: FC<SVGProps<SVGSVGElement>>
  size?: PillButtonSize
}

const getFontSize = (size: PillButtonSize) => {
  // because of tailwind, all used classes must appear as plain text
  switch (size) {
    case "tiny":
      return "text-tiny"
    case "sm":
      return "text-sm"
    case "xs":
    default:
      return "text-xs"
  }
}

export const PillButton: FC<PillButtonProps> = ({
  icon: Icon,
  size = "xs",
  className,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      className={classNames(
        getFontSize(size),
        "transition-colors duration-100 ease-out",
        "bg-grey-800 text-body-secondary inline-flex items-center justify-center leading-none outline-none",
        "gap-[0.333em] rounded-[1em] px-[1em] py-[0.666em]",
        "hover:bg-grey-700",
        className
      )}
      {...props}
    >
      {Icon && (
        <div>
          <Icon />
        </div>
      )}
      <div>{children}</div>
    </button>
  )
}

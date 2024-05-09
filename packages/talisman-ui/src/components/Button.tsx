import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, SVGProps, useMemo } from "react"

type ButtonColor = "default" | "primary" | "red" | "orange"

export type ButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  processing?: boolean
  primary?: boolean
  fullWidth?: boolean
  small?: boolean
  icon?: FC<SVGProps<SVGSVGElement>>
  iconLeft?: FC<SVGProps<SVGSVGElement>>
  color?: ButtonColor // this overrides the `primary` flag if set
}

export const Button: FC<ButtonProps> = ({
  icon: Icon,
  iconLeft: IconLeft,
  disabled,
  primary,
  fullWidth,
  small,
  processing,
  className,
  color,
  ...props
}) => {
  const colors = useMemo(() => {
    // color prop takes precedence over primary flag
    const effectiveColor: ButtonColor = color ?? (primary ? "primary" : "default")

    if (disabled)
      return classNames(
        "bg-black-tertiary text-body-disabled",
        effectiveColor === "default" ? " border" : ""
      )

    switch (effectiveColor) {
      case "default":
        return "bg-transparent text-white border border-white enabled:hover:bg-white enabled:hover:text-black focus:outline-none focus:ring-white focus:ring-2 enabled:hover:active:bg-black enabled:hover:active:text-white"

      case "primary":
        return "bg-primary-500 text-black border border-transparent focus:outline-none enabled:hover:bg-primary-700 focus:ring-white focus:ring-2 enabled:hover:active:bg-primary"

      case "orange":
        return "bg-orange-500 text-black border border-transparent focus:outline-none enabled:hover:bg-orange/90 focus:ring-white focus:ring-2 enabled:hover:active:bg-orange"

      case "red":
        return "bg-brand-orange text-black border border-transparent focus:outline-none enabled:hover:bg-brand-orange/90 focus:ring-white focus:ring-2 enabled:hover:active:bg-brand-orange"
    }
  }, [color, disabled, primary])

  return (
    <button
      type="button"
      disabled={disabled || processing}
      className={classNames(
        "bg relative inline-flex items-center justify-center rounded",
        small ? "h-20 px-8 text-sm" : "text-md h-28 px-12",
        fullWidth ? "w-full" : "",
        colors,
        className
      )}
      {...props}
    >
      {
        <div
          className={classNames("flex items-center gap-5", !disabled && processing && "invisible")}
        >
          {IconLeft && (
            <div className={small ? "text-md" : "text-lg"}>
              <IconLeft />
            </div>
          )}
          <div>{props.children}</div>
          {Icon && (
            <div className={small ? "text-md" : "text-lg"}>
              <Icon />
            </div>
          )}
        </div>
      }
      {!disabled && processing && (
        <div
          className={classNames(
            "absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center"
          )}
        >
          <LoaderIcon className="animate-spin-slow text-lg" />
        </div>
      )}
    </button>
  )
}

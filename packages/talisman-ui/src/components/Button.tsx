import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, SVGProps, useMemo } from "react"

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
  ...props
}) => {
  const colors = useMemo(() => {
    // declare as "className" to get intellisense
    let className = ""
    const enabled = !processing && !disabled

    if (primary) {
      if (disabled) return "bg-black-tertiary text-body-disabled"

      className = "bg-primary-500 text-black border border-transparent"
      if (enabled)
        className +=
          " hover:bg-primary-700 focus:bg-primary-500 active:bg-primary-500 focus:ring focus:border-white focus:border focus:ring-white focus:ring-2 active:border-transparent"
    } else {
      if (disabled) return "bg-black-tertiary text-body-disabled border"

      className = "bg-transparent text-white border "
      if (enabled)
        className +=
          " hover:border-white hover:bg-white focus:bg-transparent focus:text-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white"
    }

    return className + " active:ring-0"
  }, [disabled, primary, processing])

  return (
    <button
      type="button"
      disabled={disabled || processing}
      className={classNames(
        "bg relative inline-flex  items-center justify-center rounded outline-none",
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

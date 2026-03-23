import { LoaderIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"

import { type FC, type SVGProps, useMemo } from "react"

type ButtonColor = "default" | "primary" | "red" | "orange" | "buy" | "sell"

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

    switch (effectiveColor) {
      case "default":
        return cn(
          "border border-white bg-transparent text-white focus:border-2 focus:border-white focus:outline-hidden enabled:hover:bg-white enabled:hover:text-black enabled:hover:active:bg-black enabled:hover:active:text-white",
          "disabled:bg-black-tertiary disabled:text-body-disabled"
        )

      case "primary":
        return cn(
          "border-2 border-transparent bg-primary-500 text-black focus:border-white focus:outline-hidden enabled:hover:bg-primary-700 enabled:hover:active:bg-primary",
          "disabled:bg-primary/50"
        )

      case "orange":
        return cn(
          "border-2 border-transparent bg-orange-500 text-black focus:border-white focus:outline-hidden enabled:hover:bg-orange/90 enabled:hover:active:bg-orange",
          "disabled:bg-orange-500/50"
        )

      case "red":
        return cn(
          "border-2 border-transparent bg-brand-orange text-black focus:border-white focus:outline-hidden enabled:hover:bg-brand-orange/90 enabled:hover:active:bg-brand-orange",
          "disabled:bg-brand-orange/50"
        )

      case "buy":
        return cn(
          "border-2 border-transparent bg-buy text-black focus:border-white focus:outline-hidden enabled:hover:bg-buy/90 enabled:hover:active:bg-buy",
          "disabled:bg-buy/50"
        )

      case "sell":
        return cn(
          "border-2 border-transparent bg-sell text-black focus:border-white focus:outline-hidden enabled:hover:bg-sell/90 enabled:hover:active:bg-sell",
          "disabled:bg-sell/50"
        )
    }
  }, [color, primary])

  return (
    <button
      type="button"
      disabled={disabled || processing}
      className={cn(
        "bg relative inline-flex items-center justify-center rounded",
        small ? "h-20 px-8 text-sm" : "h-28 px-12 text-md",
        fullWidth ? "w-full" : "",
        colors,
        className
      )}
      {...props}
    >
      {
        <div className={cn("flex items-center gap-5", !disabled && processing && "invisible")}>
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
          className={cn(
            "absolute top-0 left-0 flex h-full w-full flex-col items-center justify-center"
          )}
        >
          <LoaderIcon className="animate-spin-slow text-lg" />
        </div>
      )}
    </button>
  )
}

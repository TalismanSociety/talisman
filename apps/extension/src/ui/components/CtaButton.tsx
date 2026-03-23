import { cn } from "@ui/util/cn"
import {
  type DetailedHTMLProps,
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type SVGProps,
  useCallback,
  useMemo,
} from "react"

import { useNavigate } from "react-router-dom"

export type CtaButtonSize = "large" | "small"

type CtaButton = DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  iconLeft?: FC<SVGProps<SVGSVGElement>>
  iconRight?: FC<SVGProps<SVGSVGElement>>
  title: ReactNode
  subtitle: ReactNode
  to?: string
  size?: CtaButtonSize
}

export const getContainerClassName = (size: CtaButtonSize) => {
  switch (size) {
    case "large":
      return {
        iconLeftClassName: "text-lg",
        containerClassName: "h-40",
        contentClassName: "gap-4",
        titleClassName: "text-base",
        subtitleClassName: "text-sm",
      }
    case "small":
      return {
        iconLeftClassName: "text-[20px]",
        containerClassName: "h-32",
        contentClassName: "gap-2",
        titleClassName: "text-sm",
        subtitleClassName: "text-xs",
      }
  }
}

export const CtaButton: FC<CtaButton> = ({
  iconLeft: IconLeft,
  iconRight: IconRight,
  title,
  subtitle,
  className,
  to,
  size = "large",
  onClick,
  ...props
}) => {
  const navigate = useNavigate()
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (to?.startsWith("http")) window.open(to, "_blank")
      else if (to) navigate(to)
      else if (onClick) onClick(e)
    },
    [navigate, onClick, to]
  )

  const {
    containerClassName,
    iconLeftClassName,
    contentClassName,
    titleClassName,
    subtitleClassName,
  } = useMemo(() => getContainerClassName(size), [size])

  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex w-full cursor-pointer items-center gap-8 rounded-sm bg-grey-850 px-8 text-body-disabled enabled:hover:bg-grey-800 enabled:hover:text-body disabled:cursor-not-allowed disabled:opacity-50",
        containerClassName,
        className
      )}
      onClick={handleClick}
    >
      {IconLeft && <IconLeft className={cn("shrink-0 text-body", iconLeftClassName)} />}
      <div className={cn("flex grow flex-col items-start", contentClassName)}>
        <div className={cn("text-body", titleClassName)}>{title}</div>
        <div className={cn("text-left text-body-secondary", subtitleClassName)}>{subtitle}</div>
      </div>
      {IconRight && <IconRight className="shrink-0 text-lg" />}
    </button>
  )
}

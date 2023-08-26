import { classNames } from "@talismn/util"
import {
  DetailedHTMLProps,
  FC,
  MouseEventHandler,
  ReactNode,
  SVGProps,
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
      if (to && to.startsWith("http")) window.open(to, "_blank")
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
      className={classNames(
        "bg-grey-850 enabled:hover:bg-grey-800 text-body-disabled enabled:hover:text-body flex w-full cursor-pointer items-center gap-8 rounded-sm px-8 disabled:cursor-not-allowed disabled:opacity-50",
        containerClassName,
        className
      )}
      onClick={handleClick}
    >
      {IconLeft && <IconLeft className={classNames("text-body shrink-0", iconLeftClassName)} />}
      <div className={classNames("flex grow flex-col items-start", contentClassName)}>
        <div className={classNames("text-body", titleClassName)}>{title}</div>
        <div className={classNames("text-body-secondary text-left", subtitleClassName)}>
          {subtitle}
        </div>
      </div>
      {IconRight && <IconRight className="shrink-0 text-lg" />}
    </button>
  )
}

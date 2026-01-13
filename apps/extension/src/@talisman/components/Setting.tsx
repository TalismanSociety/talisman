import { classNames } from "@talismn/util"
import { FC, ReactNode, SVGProps, useMemo } from "react"
import { CtaButtonSize, getContainerClassName } from "talisman-ui"

export const Setting: FC<{
  iconLeft?: FC<SVGProps<SVGSVGElement>>
  iconRight?: FC<SVGProps<SVGSVGElement>>
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  className?: string
  size?: CtaButtonSize
}> = ({
  iconLeft: IconLeft,
  iconRight: IconRight,
  title,
  subtitle,
  children,
  className,
  size = "large",
}) => {
  const {
    containerClassName,
    iconLeftClassName,
    contentClassName,
    titleClassName,
    subtitleClassName,
  } = useMemo(() => getContainerClassName(size), [size])

  return (
    <div
      className={classNames(
        "text-body-secondary bg-grey-850 flex w-full items-center gap-8 rounded-sm px-8",
        containerClassName,
        className
      )}
    >
      {IconLeft && <IconLeft className={classNames("text-body shrink-0", iconLeftClassName)} />}
      <div className={classNames("flex grow flex-col items-start", contentClassName)}>
        <div className={classNames("text-body", titleClassName)}>{title}</div>
        <div className={classNames("text-body-secondary text-left", subtitleClassName)}>
          {subtitle}
        </div>
      </div>
      {children}
      {IconRight && <IconRight className="shrink-0 text-lg" />}
    </div>
  )
}

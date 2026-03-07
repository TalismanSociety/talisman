import { classNames } from "@talismn/util"
import { type CtaButtonSize, getContainerClassName } from "@ui/talisman-ui"
import { type FC, type ReactNode, type SVGProps, useMemo } from "react"

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
        "flex w-full items-center gap-8 rounded-sm bg-grey-850 px-8 text-body-secondary",
        containerClassName,
        className
      )}
    >
      {IconLeft && <IconLeft className={classNames("shrink-0 text-body", iconLeftClassName)} />}
      <div className={classNames("flex grow flex-col items-start", contentClassName)}>
        <div className={classNames("text-body", titleClassName)}>{title}</div>
        <div className={classNames("text-left text-body-secondary", subtitleClassName)}>
          {subtitle}
        </div>
      </div>
      {children}
      {IconRight && <IconRight className="shrink-0 text-lg" />}
    </div>
  )
}

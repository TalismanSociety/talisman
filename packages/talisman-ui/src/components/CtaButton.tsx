import { classNames } from "@talismn/util"
import { DetailedHTMLProps, FC, MouseEventHandler, ReactNode, SVGProps, useCallback } from "react"
import { useNavigate } from "react-router-dom"

type CtaButton = DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  iconLeft?: FC<SVGProps<SVGSVGElement>>
  iconRight?: FC<SVGProps<SVGSVGElement>>
  title: ReactNode
  subtitle: ReactNode
  to?: string
}

export const CtaButton: FC<CtaButton> = ({
  iconLeft: IconLeft,
  iconRight: IconRight,
  title,
  subtitle,
  className,
  to,
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

  return (
    <button
      {...props}
      className={classNames(
        "bg-grey-900 enabled:hover:bg-grey-800 text-body-disabled enabled:hover:text-body flex h-40 w-full cursor-pointer items-center gap-8 rounded-sm px-8 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={handleClick}
    >
      {IconLeft && <IconLeft className="text-body text-lg" />}
      <div className="flex grow flex-col items-start gap-4">
        <div className="text-body">{title}</div>
        <div className="text-body-secondary text-sm">{subtitle}</div>
      </div>
      {IconRight && <IconRight className="text-lg" />}
    </button>
  )
}

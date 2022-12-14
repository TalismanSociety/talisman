import { FC, ReactNode, SVGProps } from "react"
import { classNames } from "talisman-ui"

type OnboardCtaProps = {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: FC<SVGProps<SVGSVGElement>>
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export const OnboardCta: FC<OnboardCtaProps> = ({
  className,
  title,
  subtitle,
  icon: Icon,
  disabled,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "text-body flex h-[18rem] w-[38rem] flex-col justify-between rounded bg-white/5 p-16 backdrop-blur-xl",
        "hover:text-body-black transition-colors hover:bg-white",
        "disabled:text-body disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-50",
        className
      )}
      disabled={disabled}
    >
      <div className="flex w-full">
        <div className="grow text-left text-xl">{title}</div>
        <div>{Icon && <Icon className="text-[4rem] transition-none" />}</div>
      </div>
      <div className="w-full text-left">{subtitle}</div>
    </button>
  )
}

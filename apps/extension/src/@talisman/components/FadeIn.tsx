import { DetailedHTMLProps, FC, HTMLAttributes, useEffect, useState } from "react"
import { classNames } from "talisman-ui"

type FadeInProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>

export const FadeIn: FC<FadeInProps> = ({ className, ...props }) => {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    setOpacity(1)
  }, [])

  return (
    <div
      {...props}
      className={classNames("transition-opacity", opacity ? "opacity-100" : "opacity-0", className)}
    />
  )
}

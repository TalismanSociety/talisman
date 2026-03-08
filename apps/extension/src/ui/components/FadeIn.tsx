import { classNames } from "@talismn/util"
import { type DetailedHTMLProps, type FC, type HTMLAttributes, useEffect, useState } from "react"

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

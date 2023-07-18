import { FC } from "react"

import { FadeIn } from "./FadeIn"
import { StatusIcon } from "./StatusIcon"

export const FullScreenLoader: FC<{ spin?: boolean; title?: string; subtitle?: string }> = ({
  spin = false,
  title,
  subtitle,
}) => {
  return (
    <FadeIn className="flex h-screen w-screen flex-col items-center justify-center">
      <StatusIcon status={spin ? "SPINNING" : "STATIC"} title={title} subtitle={subtitle} />
    </FadeIn>
  )
}

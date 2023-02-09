import { classNames } from "@talismn/util"
import { useMeasure } from "react-use"

import { AccountCanvas as LoginCanvas } from "./LoginCanvas"
import { LOGIN_PHYSICS, LoginPhysics } from "./LoginPhysics"

export const LoginBackground = ({
  className,
  colors,
  config = LOGIN_PHYSICS,
}: {
  config?: LoginPhysics
  colors: [string, string]
  className?: string
}) => {
  const [refSize, size] = useMeasure<HTMLDivElement>()

  return (
    <div ref={refSize} className={classNames(className)}>
      <div className="absolute top-0 left-0 h-full w-full">
        {config && !!size.height && (
          <LoginCanvas
            size={size}
            colors={colors}
            config={config}
            className="absolute top-0 left-0 h-full w-full"
          />
        )}
      </div>
    </div>
  )
}

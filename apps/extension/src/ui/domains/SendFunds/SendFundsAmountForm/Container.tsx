import { classNames } from "@talismn/util"
import type { DetailedHTMLProps, FC } from "react"

type ContainerProps = DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

export const Container: FC<ContainerProps> = (props) => {
  return (
    <div
      {...props}
      className={classNames("rounded bg-grey-900 text-body-secondary", props.className)}
    />
  )
}

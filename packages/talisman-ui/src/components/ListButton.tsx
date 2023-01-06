import { ButtonHTMLAttributes, DetailedHTMLProps, FC } from "react"

import { classNames } from "../utils"

type ListButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>

export const ListButton: FC<ListButtonProps> = (props) => {
  return (
    <button
      type="button"
      {...props}
      className={classNames(
        "bg-grey-800 hover:bg-grey-700 text-body-secondary hover:text-body allow-focus flex h-28 w-full items-center gap-6 rounded-sm px-8 text-left",
        props.className
      )}
    />
  )
}

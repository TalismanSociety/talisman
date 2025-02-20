import { classNames } from "@talismn/util"
import { ChangeEventHandler, FC, ReactNode } from "react"

export const Radio: FC<{
  name: string
  value: string
  label?: ReactNode
  checked?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement>
  className?: string
}> = ({ name, value, label, checked, className, onChange }) => {
  return (
    <label
      className={classNames(
        "cursor-pointer p-0.5",
        "hover:text-grey-300",
        "has-[:checked]:text-body has-[:checked]:cursor-default",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className={classNames(
          "bg-body-disabled h-[0.8em] w-[0.8em] appearance-none rounded-full",
          "checked:bg-primary checked:border-body-disabled checked:border-[0.15em]",
          "ring-body focus-visible:ring-1",
        )}
      />
      {!!label && <span className="ml-3">{label}</span>}
    </label>
  )
}

import { CheckIcon } from "@talismn/icons"
import { classNames } from "@ui/util/cn"

import type { FC } from "react"

type ExclusiveButtonsListProps<T> = {
  options: ExclusiveButtonsListItemProps<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

type ExclusiveButtonsListItemProps<T> = {
  value: T
  label: string
}

export const ExclusiveButtonsList = <T extends string | number>({
  options,
  value,
  onChange,
  className,
}: ExclusiveButtonsListProps<T>) => {
  return (
    <div className={classNames("flex flex-col gap-4", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          displayName={option.label}
          selected={option.value === value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}

const Button: FC<{
  displayName: string
  selected: boolean
  onClick: () => void
}> = ({ displayName, selected, onClick }) => {
  return (
    <button
      type="button"
      className={classNames(
        "flex h-28 w-full items-center justify-between gap-4 rounded-sm px-6 text-body-secondary sm:px-8",
        "border border-grey-800",
        selected && "bg-grey-900 text-body",
        "stroke-primary hover:border-grey-700 hover:bg-grey-800"
      )}
      onClick={onClick}
    >
      <div>{displayName}</div>
      {!!selected && <CheckIcon className="text-base text-primary sm:text-lg" />}
    </button>
  )
}

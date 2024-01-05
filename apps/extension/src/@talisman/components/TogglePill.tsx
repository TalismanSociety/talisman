import { FC, ReactNode, useCallback, useEffect, useState } from "react"
import { PillButton } from "talisman-ui"

const Checked = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9.11114 3.66675L4.83336 7.94453L2.88892 6.00008"
      stroke="#D5FF5C"
      strokeWidth="0.888889"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Unchecked = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="0.333333"
      y="0.333333"
      width="11.3333"
      height="11.3333"
      rx="2.33333"
      stroke="currentColor"
      strokeWidth="0.666667"
    />
  </svg>
)

type TogglePillProps = {
  label: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export const TogglePill: FC<TogglePillProps> = ({
  label,
  checked,
  defaultChecked,
  onChange,
  className,
}) => {
  const [isChecked, setIsChecked] = useState(() => checked ?? defaultChecked ?? false)

  const handleClick = useCallback(() => {
    let value: boolean = false
    setIsChecked((prev) => {
      value = !prev
      return !prev
    })
    onChange(value)
  }, [onChange])

  useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked)
    }
  }, [checked])

  return (
    <PillButton
      icon={isChecked ? Checked : Unchecked}
      onClick={handleClick}
      size="xs"
      className={className}
    >
      {label}
    </PillButton>
  )
}

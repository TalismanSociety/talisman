import { Options, passwordStrength } from "check-password-strength"
import { useMemo } from "react"

const getColorClassName = (strength: number) => {
  switch (strength) {
    case 1:
      return "text-alert-error"
    case 2:
      return "text-alert-warn"
    case 3:
      return "text-alert-success"
    default:
      return ""
  }
}

type PasswordStrengthProps = {
  password?: string
}

// defaults changed to be considered weak starting from 1 character and strong after 12
const STRENGTH_OPTIONS: Options<string> = [
  {
    id: 0,
    value: "Too weak", // never displays
    minDiversity: 0,
    minLength: 0,
  },
  {
    id: 1,
    value: "Weak",
    minDiversity: 1,
    minLength: 1,
  },
  {
    id: 2,
    value: "Medium",
    minDiversity: 2,
    minLength: 6,
  },
  {
    id: 3,
    value: "Strong",
    minDiversity: 4,
    minLength: 12,
  },
]

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = useMemo(() => passwordStrength(password as string, STRENGTH_OPTIONS), [password])

  // Don't show if too weak (empty)
  if (!strength.id) return null

  return <span className={getColorClassName(strength.id)}>{strength.value}</span>
}

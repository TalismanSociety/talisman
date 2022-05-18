import Circle from "@talisman/components/Circle"
import { passwordStrength } from "check-password-strength"
import { useMemo } from "react"
import styled from "styled-components"

const PasswordStrengthCircle = styled(Circle).attrs((props: { strength: number }) => ({
  strength: props.strength ?? -1,
}))`
  .progress {
    ${({ strength }) => {
      switch (strength) {
        case 0:
          return "stroke: var(--color-status-error);"
        case 1:
          return "stroke: var(--color-status-concern);"
        case 2:
          return "stroke: yellow;"
        case 3:
          return "stroke: var(--color-status-success);"
        default:
          return ""
      }
    }}
  }
`

type PasswordStrengthProps = {
  password?: string
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const { strength, progress } = useMemo(() => {
    const s = password?.length ? passwordStrength(password as string)?.id % 4 : 0
    return {
      strength: s,
      progress: password?.length ? (1 + s) * 25 : 0,
    }
  }, [password])

  return <PasswordStrengthCircle lineWidth={50} strength={strength} progress={progress} />
}

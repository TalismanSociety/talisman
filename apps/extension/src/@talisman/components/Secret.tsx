import styled from "styled-components"
import Field from "./Field"

interface IProps {
  value: string
  [key: string]: any
  className?: string
}

const Secret = ({ value, className, ...props }: IProps) => (
  <Field.Textarea
    {...props}
    className={`secret ${className}`}
    value={value}
    extra={
      <>
        Word count: {!value.length ? value.length : value.trim().split(" ").length} {}
      </>
    }
    pattern="[a-z]+"
  />
)

const StyledSecret = styled(Secret)`
  margin-bottom: 1.5em;
`

export default StyledSecret

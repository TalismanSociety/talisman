import styled from "styled-components"
import { Button } from "talisman-ui"

import { SimpleButton } from "./SimpleButton"

interface IProps {
  icon?: JSX.Element
  title?: string | JSX.Element
  text?: string | JSX.Element
  extra?: string | JSX.Element
  confirming?: boolean
  confirmDisabled?: boolean
  confirmText?: string | JSX.Element
  cancelText?: string | JSX.Element
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

const Dialog = ({
  icon,
  title,
  text,
  extra,
  confirming,
  confirmDisabled,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  className,
}: IProps) => {
  return (
    <article className={className}>
      {(!!icon || !!title) && (
        <header>
          {icon}
          {title && <h1>{title}</h1>}
        </header>
      )}
      {text && <p>{text}</p>}
      {extra && <div>{extra}</div>}
      <footer>
        <Button onClick={onCancel}>{cancelText || "Cancel"}</Button>
        <Button primary onClick={onConfirm} disabled={confirmDisabled} processing={confirming}>
          {confirmText || "Confirm"}
        </Button>
      </footer>
    </article>
  )
}

const StyledDialog = styled(Dialog)`
  > header {
    display: flex;
    align-items: center;
    color: var(--color-mid);
    h1 {
      font-size: var(--font-size-medium);
      margin: 0 0 0 0.4em;
    }
  }
  > p {
    font-size: var(--font-size-small);
    color: var(--color-background-muted-2x);
    line-height: 1.3em;
    margin-top: 0.5em;
  }
  > footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 3rem;
    > button {
      width: 48%;
    }
  }
`

export default StyledDialog

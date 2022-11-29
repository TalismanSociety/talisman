import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"
import styled from "styled-components"

const Container = styled.div`
  margin-top: 0.8rem;
  .label {
    color: var(--color-mid);
  }

  .decode-mode {
    cursor: pointer;
    text-decoration: underline;
  }
  .decode-mode:hover {
    color: var(--color-foreground-muted-2x);
  }
  .decode-mode-active,
  .decode-mode-active:hover {
    color: var(--color-foreground);
    text-decoration: none;
    cursor: default;
  }

  .prewrap {
    white-space: pre-wrap;
  }

  .breakAll {
    word-break: break-all;
  }
`

export type ViewDetailsFieldProps = {
  label: ReactNode
  prewrap?: boolean
  breakAll?: boolean
  error?: string
  children?: ReactNode
}

export const ViewDetailsField: FC<ViewDetailsFieldProps> = ({
  label,
  children,
  error,
  prewrap,
  breakAll,
}) =>
  error || children ? (
    <Container className="field">
      <div className="label">{label}</div>
      <div
        className={classNames(
          "value",
          prewrap && "prewrap",
          breakAll && "breakAll",
          error && "error"
        )}
      >
        {error || children}
      </div>
    </Container>
  ) : null

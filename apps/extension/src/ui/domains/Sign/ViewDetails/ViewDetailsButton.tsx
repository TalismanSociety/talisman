import { LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { FC, useCallback, useState } from "react"
import styled from "styled-components"

const Analysing = styled.div.attrs({
  children: (
    <>
      <div>
        <LoaderIcon className="animate-spin-slow" />
      </div>
      <div>
        <span>Decoding....</span>
      </div>
    </>
  ),
})`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  height: var(--font-size-large);
  div {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
  }
  span {
    font-size: var(--font-size-xsmall);
    color: var(--color-background-muted-2x);
  }
  svg {
    font-size: var(--font-size-medium);
    stroke: white;
  }
`

export const Button = styled.button`
  background: var(--color-background-muted-3x);
  padding: 0.4rem 0.6rem;
  border-radius: 4.8rem;
  font-weight: var(--font-weight-regular);
  color: var(--color-mid);
  outline: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition-speed-fast) ease-in;
  margin-bottom: 0.4rem;

  font-size: var(--font-size-tiny);
  line-height: var(--font-size-xsmall);

  :hover {
    background: var(--color-background-muted-3x);
    color: var(--color-foreground-muted-2x);
  }

  &.warning {
    color: var(--color-status-warning);
    opacity: 0.8;
  }
  &.warning:hover {
    opacity: 1;
  }
  &.hide {
    display: none;
  }
`

type ViewDetailsButtonProps = {
  hide?: boolean
  onClick: () => void
  isAnalysing?: boolean
  hasError?: boolean
}

export const ViewDetailsButton: FC<ViewDetailsButtonProps> = ({
  onClick,
  hide,
  isAnalysing = false,
  hasError = false,
}) => {
  const [hasClickRequest, setHasClickRequest] = useState(false)

  const handleClick = useCallback(() => {
    setHasClickRequest(true)
    if (onClick) onClick()
  }, [onClick])

  if (hasClickRequest && isAnalysing) return <Analysing />

  return (
    <Button className={classNames(hasError && "warning", hide && "hide")} onClick={handleClick}>
      View Details
    </Button>
  )
}

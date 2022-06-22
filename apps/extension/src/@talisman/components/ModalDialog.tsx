import styled from "styled-components"
import { ReactComponent as IconClose } from "@talisman/theme/icons/x.svg"
import { classNames } from "@talisman/util/classNames"
import { FC, MouseEvent, ReactNode } from "react"

const Container = styled.div`
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 42rem;
  max-width: 100%;
  max-height: 100%;
  background: var(--color-background);
  border: var(--border);
  border-radius: max(0px, min(var(--border-radius), calc((100vw - 2px - 100%) * 9999)));

  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--padding);
    position: relative;

    h1,
    .close {
      margin: 0;
    }

    h1 {
      font-size: var(--font-size-normal);
    }

    .close {
      cursor: pointer;
      font-size: var(--font-size-large);
    }
  }

  &.centerTitle > header {
    h1 {
      text-align: center;
      flex-grow: 1;
    }
    .close {
      position: absolute;
      top: 2.2rem;
      right: 2rem;
    }
  }

  > .content {
    flex-grow: 1;
    padding: var(--padding);
    padding-top: 0;
    border-radius: var(--border-radius);
    overflow: auto;
  }
`
const preventPropagation = (e: MouseEvent) => e.stopPropagation()

type ModalDialogProps = {
  className?: string
  title?: ReactNode
  centerTitle?: boolean
  onClose?: () => void
  children?: ReactNode
}

export const ModalDialog: FC<ModalDialogProps> = ({
  className,
  title,
  centerTitle,
  onClose,
  children,
}) => {
  return (
    <Container
      className={classNames("modal-dialog", centerTitle && "centerTitle", className)}
      onClick={preventPropagation}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header>
        <h1>{title}</h1>
        {onClose && <IconClose className="close" onClick={onClose} />}
      </header>
      <div className="content">{children}</div>
    </Container>
  )
}

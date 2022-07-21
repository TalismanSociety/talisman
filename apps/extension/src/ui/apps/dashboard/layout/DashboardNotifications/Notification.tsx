import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import { XIcon } from "@talisman/theme/icons"
import { ReactNode } from "react"
import styled from "styled-components"

const Button = styled.button`
  border-radius: 24px;
  background-color: var(--color-primary);
  color: black;
  padding: 0.4rem 1.6rem;
  font-size: 1.4rem;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  min-width: 12rem;
`

type NotificationProps = {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  onActionClick: () => void
  onClose?: () => void
}

export const Notification = ({
  icon,
  title,
  description,
  onClose,
  action,
  onActionClick,
}: NotificationProps) => {
  return (
    <Box
      flex
      fullwidth
      border="1px solid var(--color-foreground)"
      borderradius
      padding="1.6rem"
      fontsize="normal"
      gap={1.2}
      bg="background"
      align="center"
    >
      {icon && (
        <Box flex column justify="center" fontsizecustom={3.8} fg="primary">
          {icon}
        </Box>
      )}
      <Box grow>
        <Box inline>{title}</Box>
        <Box inline fg="mid">
          {description}
        </Box>
      </Box>
      {action && (
        <Box fontsize="large">{action && <Button onClick={onActionClick}>{action}</Button>}</Box>
      )}
      <Box flex column justify="center" fontsize="large">
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      </Box>
    </Box>
  )
}

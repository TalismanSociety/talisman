import { Box } from "@talisman/components/Box"
import { CheckCircleIcon, IconAlert, LoaderIcon, XCircleIcon } from "@talisman/theme/icons"
import { ReactNode } from "react"
import styled from "styled-components"

const SuccessIcon = styled(CheckCircleIcon)`
  width: 3.2rem;
  height: 3.2rem;
  color: var(--color-status-success);
`
const WarnIcon = styled(IconAlert)`
  width: 3.2rem;
  height: 3.2rem;
  color: var(--color-status-warning);
`

const ErrorIcon = styled(XCircleIcon)`
  width: 3.2rem;
  height: 3.2rem;
  color: var(--color-status-error);
`
const ProcessingIcon = styled(LoaderIcon)`
  width: 3.2rem;
  height: 3.2rem;
  color: var(--color-status-default);
`

type NotificationType = "success" | "error" | "processing" | "warn"

export type NotificationProps = {
  type: NotificationType
  title: ReactNode
  subtitle?: ReactNode
}

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  if (type === "success") return <SuccessIcon />
  if (type === "warn") return <WarnIcon />
  if (type === "error") return <ErrorIcon />
  if (type === "processing") return <ProcessingIcon className="animate-spin-slow" />
  return null
}

export const Notification = ({ title, subtitle, type }: NotificationProps) => {
  return (
    <Box flex gap={1.6} align="center">
      <Box>
        <NotificationIcon type={type} />
      </Box>
      <Box grow>
        <Box fg="foreground">{title}</Box>
        {subtitle && (
          <Box fg="mid" fontsize="small" margin="0.4rem 0 0 0">
            {subtitle}
          </Box>
        )}
      </Box>
    </Box>
  )
}

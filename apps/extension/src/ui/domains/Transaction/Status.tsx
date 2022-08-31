import { TransactionStatus } from "@core/domains/transactions/types"
import StatusIcon from "@talisman/components/StatusIcon"
import { useMemo } from "react"

interface IProps {
  className?: string
  status?: TransactionStatus
  message?: string
}

const Status = ({ status, message, className }: IProps) => {
  const iconStatus = useMemo(
    () =>
      status === "PENDING"
        ? "SPINNING"
        : status === "SUCCESS" || status === "ERROR"
        ? status
        : "STATIC",
    [status]
  )

  const subtitle = useMemo(
    () =>
      status === "PENDING"
        ? "This may take a few minutes"
        : status === "SUCCESS"
        ? "Your transaction is complete"
        : "Transaction not found",
    [status]
  )

  return (
    <StatusIcon className={className} status={iconStatus} title={message} subtitle={subtitle} />
  )
}

export default Status

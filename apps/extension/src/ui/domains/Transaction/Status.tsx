import { useState, useEffect } from "react"
import useTransactionById from "@ui/hooks/useTransactionById"
import StatusIcon, { StatusIconStatus } from "@talisman/components/StatusIcon"

interface IProps {
  id: string
  className?: string
}

const Status = ({ id, className }: IProps) => {
  const { status, message } = useTransactionById(id)
  const [iconStatus, setIconStatus] = useState<StatusIconStatus>("SPINNING")
  const [subtitle, setSubtitle] = useState("This may take a few minutes")

  useEffect(() => {
    setIconStatus(
      status === "PENDING"
        ? "SPINNING"
        : status === "SUCCESS" || status === "ERROR"
        ? status
        : "STATIC"
    )

    setSubtitle(
      status === "PENDING"
        ? "This may take a few minutes"
        : status === "SUCCESS"
        ? "Your transaction is complete"
        : "Transaction not found"
    )
  }, [status, message])

  return (
    <StatusIcon className={className} status={iconStatus} title={message} subtitle={subtitle} />
  )
}

export default Status

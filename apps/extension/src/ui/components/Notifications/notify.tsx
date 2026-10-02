import { classifyError, type ErrorCategory } from "@common/analytics/errorCategory"
import { sleep } from "@talismn/util"
import { reportToastError } from "@ui/hooks/analytics/errorShown"
import { type Id, type ToastContent, type ToastOptions, toast } from "react-toastify"

import { Notification, type NotificationProps } from "./Notification"

const DEFAULT_OPTIONS: ToastOptions = {
  theme: "dark",
  closeButton: false,
  hideProgressBar: true,
  autoClose: 2000,
}

const categoryOf = (content: Extract<NotificationProps, { type: "error" }>): ErrorCategory =>
  content.errorCategory ?? classifyError(content.cause)

export const notify = (content: NotificationProps, options: ToastOptions = {}): Id => {
  const toastId = toast(<Notification {...content} />, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
  if (content.type === "error") reportToastError(toastId, categoryOf(content))
  return toastId
}

export const notifyCustom = (content: ToastContent<unknown>, options: ToastOptions = {}): Id => {
  return toast(content, {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}

export const notifyUpdate = async (
  toastId: Id,
  content: NotificationProps,
  options: ToastOptions = {}
) => {
  // toast.isActive may return false if the toast is not yet rendered
  await sleep(50)

  if (toast.isActive(toastId)) {
    toast.update(toastId, {
      ...DEFAULT_OPTIONS,
      render: () => <Notification {...content} />,
      ...options,
    })
    if (content.type === "error") reportToastError(toastId, categoryOf(content))
  } else notify(content, options)
}
